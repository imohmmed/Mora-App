/**
 * QuickAddSheet — slides up when user taps ADD TO BAG.
 *
 * Layout (shared across every section + related products):
 *   1. Horizontal scrollable product images (with page dots)
 *   2. Product name + price
 *   3. Variant chips
 *   4. Action row: [ADD TO BAG]  +  [♥ favorite]
 *
 * The heart fills blue when the product is in the wishlist.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/context/ThemeContext";
import { useWishlist } from "@/context/WishlistContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { requestRestockNotify } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import type { ColorEntry, Product, Variant } from "@/lib/types";

const PRIMARY = "#0274C1";
const { width: SW } = Dimensions.get("window");
const GALLERY_W = SW - 40; // sheet has 20px horizontal padding
const GALLERY_H = Math.min(GALLERY_W, 300);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SIZE_TOKENS = new Set([
  "xxs","xs","s","m","l","xl","xxl","2xl","3xl","4xl","5xl",
  "one size","os","free size",
]);
function inferLabel(values: string[]): string {
  const lower = values.map((v) => v.toLowerCase().trim());
  if (lower.every((v) => SIZE_TOKENS.has(v) || /^\d{2,3}(cm|mm|in|")?$/.test(v))) return "SIZE";
  if (lower.every((v) => /^(red|blue|green|black|white|pink|grey|gray|navy|beige|ivory|camel|tan|brown|purple|yellow|orange|teal|cream|khaki|mint|coral|rose|nude|sand)$/.test(v))) return "COLOR";
  return "OPTION";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirm: (variant: Variant, qty: number) => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function QuickAddSheet({ visible, product, onClose, onConfirm }: Props) {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const { isWishlisted, toggle } = useWishlist();
  const { lang } = useLanguage();
  const { token } = useAuth();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const [selectedOpt1, setSelectedOpt1] = useState<string | null>(null);
  const [selectedOpt2, setSelectedOpt2] = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setSelectedOpt1(null);
    setSelectedOpt2(null);
    setActiveImg(0);
    setNotified(false);
    setNotifying(false);
    setQuantity(1);
  }, [product?.id]);

  useEffect(() => { setQuantity(1); }, [selectedOpt1, selectedOpt2]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 14, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 600, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const variants = product?.variants ?? [];

  const opt1Values = useMemo(() => (
    [...new Set(variants.map((v) => v.option1).filter((v): v is string => !!v && v !== "Default Title"))]
  ), [variants]);

  const opt2Values = useMemo(() => (
    [...new Set(variants.map((v) => v.option2).filter((v): v is string => !!v && v !== "Default Title"))]
  ), [variants]);

  const hasOpt1 = opt1Values.length > 0;
  const hasOpt2 = opt2Values.length > 0;
  const definedName = (idx: number): string | null => {
    const def = product?.optionDefinitions?.[idx];
    if (!def) return null;
    const n = lang === "ar"
      ? (def.nameAr || def.nameEn || def.name)
      : (def.nameEn || def.nameAr || def.name);
    return n && n.trim() ? n.trim() : null;
  };
  const label1 = useMemo(() => definedName(0) ?? inferLabel(opt1Values), [opt1Values, product?.optionDefinitions, lang]);
  const label2 = useMemo(() => definedName(1) ?? inferLabel(opt2Values), [opt2Values, product?.optionDefinitions, lang]);

  const selectedVariant: Variant | null = useMemo(() => {
    if (hasOpt1 && !selectedOpt1) return null;
    if (hasOpt2 && !selectedOpt2) return null;
    return variants.find((v) =>
      (!hasOpt1 || v.option1 === selectedOpt1) &&
      (!hasOpt2 || v.option2 === selectedOpt2)
    ) ?? null;
  }, [selectedOpt1, selectedOpt2, variants, hasOpt1, hasOpt2]);

  if (!product) return null;

  const liked = isWishlisted(product.id);
  const images = (product.images ?? []).filter(Boolean);

  const isOpt1OOS = (val: string) =>
    variants.filter((v) => v.option1 === val).every((v) => v.inventory === 0);
  const isOpt2OOS = (val: string) => {
    const related = variants.filter(
      (v) => v.option2 === val && (!selectedOpt1 || v.option1 === selectedOpt1)
    );
    return related.length === 0 || related.every((v) => v.inventory === 0);
  };

  const canAdd = (!hasOpt1 || !!selectedOpt1) && (!hasOpt2 || !!selectedOpt2);

  // Whole product sold out → offer "Notify me" instead of "Add to bag".
  const fullyOOS = variants.length > 0 && variants.every((v) => (v.inventory ?? 0) <= 0);

  const maxStock = selectedVariant
    ? (selectedVariant.inventory ?? 0)
    : (variants.find((v) => (v.inventory ?? 0) > 0)?.inventory ?? 99);

  const handleAdd = () => {
    const toAdd = selectedVariant ?? variants[0];
    if (!toAdd) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onConfirm(toAdd, quantity);
    onClose();
  };

  const handleNotify = async () => {
    if (!product) return;
    if (!token) {
      if (isWeb) {
        const ok = window.confirm(
          lang === "ar"
            ? "سجّل دخولك حتى نبلغك عند توفر المنتج. تسجيل الدخول الآن؟"
            : "Sign in so we can notify you when it's back in stock. Sign in now?",
        );
        if (ok) { onClose(); router.push("/auth"); }
      } else {
        onClose();
        router.push("/auth");
      }
      return;
    }
    // Register for every variant so any size coming back in stock alerts the user.
    const ids = [...new Set(variants.map((v) => v.id))];
    try {
      setNotifying(true);
      await Promise.all(ids.map((vid) => requestRestockNotify(token, product.id, vid)));
      setNotified(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      const msg = lang === "ar" ? "صار خطأ، حاول مرة ثانية" : "Something went wrong, please try again";
      if (isWeb) window.alert(msg);
    } finally {
      setNotifying(false);
    }
  };

  const handleHeart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggle(product.id);
  };

  const onGalleryScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const rawIdx = Math.round(e.nativeEvent.contentOffset.x / GALLERY_W);
    // For Arabic the images are rendered reversed, so reverse the dot index back
    const idx = lang === "ar" ? Math.max(0, images.length - 1 - rawIdx) : rawIdx;
    if (idx !== activeImg) setActiveImg(idx);
  };

  const btnLabel = (() => {
    if (lang === "ar") {
      if (hasOpt1 && !selectedOpt1) return `اختر ${label1}`;
      if (hasOpt2 && !selectedOpt2) return `اختر ${label2}`;
      return "اضفه لسلتي";
    }
    if (hasOpt1 && !selectedOpt1) return `SELECT ${label1}`;
    if (hasOpt2 && !selectedOpt2) return `SELECT ${label2}`;
    return "ADD TO BAG";
  })();

  // ── Theme tokens ─────────────────────────────────────────────────────────────
  const handleCol  = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.20)";
  const textPri    = isDark ? "#FFFFFF" : "#000000";
  const textMuted  = isDark ? "rgba(255,255,255,0.50)" : "rgba(0,0,0,0.44)";
  const chipBg     = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)";
  const chipBorder = isDark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.14)";
  const imageBg    = isDark ? "#2C2C2E" : "#F2F2F7";
  const divider    = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
  const sheetBg    = isDark ? "rgba(30,30,34,0.98)" : "rgba(255,255,255,0.98)";
  const heartBg    = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.05)";
  const heartBorder = liked ? PRIMARY : (isDark ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.12)");

  const opt1Def = product?.optionDefinitions?.[0];
  const opt2Def = product?.optionDefinitions?.[1];
  const isOpt1Color = opt1Def?.type === "color";
  const isOpt2Color = opt2Def?.type === "color";

  // ── Color circle renderer ──────────────────────────────────────────────────
  const renderColorChips = (
    colorEntries: ColorEntry[],
    values: string[],
    selected: string | null,
    onSelect: (v: string) => void,
    isOOS: (v: string) => boolean,
    label: string,
  ) => {
    const selEntry = colorEntries.find((c) => c.nameEn === selected || c.hex === selected);
    const selName = selEntry
      ? (lang === "ar" ? (selEntry.nameAr || selEntry.nameEn) : (selEntry.nameEn || selEntry.nameAr))
      : selected;
    return (
      <View style={[styles.axisWrap, lang === "ar" && { alignItems: "flex-end" }]}>
        <Text style={[styles.axisLabel, { color: textMuted }, lang === "ar" && { textAlign: "right" }]}>
          {lang === "ar"
            ? (selected ? `${label} — ${selName}` : `اختر ${label}`)
            : (selected ? `${label} — ${selName}` : `SELECT ${label}`)}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipRow, lang === "ar" && { flexDirection: "row-reverse" }]}
        >
          {values.map((val) => {
            const entry = colorEntries.find((c) => c.nameEn === val || c.hex === val);
            const hex = entry?.hex || "#888888";
            const active = selected === val;
            const oos = isOOS(val);
            return (
              <Pressable
                key={val}
                style={{ opacity: oos ? 0.35 : 1 }}
                onPress={() => !oos && onSelect(val)}
                disabled={oos}
              >
                <View
                  style={[
                    styles.colorSwatch,
                    {
                      backgroundColor: hex,
                      borderWidth: active ? 3 : 1.5,
                      borderColor: active ? PRIMARY : "rgba(0,0,0,0.18)",
                    },
                  ]}
                >
                  {active && <View style={styles.colorSwatchRing} />}
                  {oos && <View style={styles.strikeThrough} />}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // ── Chip renderer ─────────────────────────────────────────────────────────────
  const renderChips = (
    values: string[],
    selected: string | null,
    onSelect: (v: string) => void,
    isOOS: (v: string) => boolean,
    label: string,
  ) => (
    <View style={[styles.axisWrap, lang === "ar" && { alignItems: "flex-end" }]}>
      <Text style={[styles.axisLabel, { color: textMuted }, lang === "ar" && { textAlign: "right" }]}>
        {lang === "ar"
          ? (selected ? `${label} — ${selected}` : `اختر ${label}`)
          : (selected ? `${label} — ${selected}` : `SELECT ${label}`)}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.chipRow, lang === "ar" && { flexDirection: "row-reverse" }]}
      >
        {values.map((val) => {
          const active = selected === val;
          const oos    = isOOS(val);
          return (
            <Pressable
              key={val}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? PRIMARY : chipBg,
                  borderColor: active ? PRIMARY : chipBorder,
                  opacity: oos ? 0.35 : pressed ? 0.75 : 1,
                },
              ]}
              onPress={() => !oos && onSelect(val)}
              disabled={oos}
            >
              <Text style={[styles.chipText, { color: active ? "#FFF" : textPri }]}>
                {val}
              </Text>
              {oos && <View style={styles.strikeThrough} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      {/* ── Tap-anywhere-to-close backdrop ────────────────────────────────── */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
          <BlurView
            style={StyleSheet.absoluteFill}
            intensity={55}
            tint={isDark ? "dark" : "light"}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.28)" }]} />
        </Animated.View>
      </Pressable>

      {/* ── Sheet ─────────────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: sheetBg, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: handleCol }]} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          {/* ── Scrollable image gallery ─────────────────────────────────── */}
          <View style={[styles.gallery, { backgroundColor: imageBg }]}>
            {images.length > 0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onGalleryScroll}
                scrollEventThrottle={16}
              >
                {(lang === "ar" ? [...images].reverse() : images).map((uri, i) => (
                  <Image
                    key={`${uri}-${i}`}
                    source={{ uri }}
                    style={{ width: GALLERY_W, height: GALLERY_H }}
                    contentFit="cover"
                    transition={150}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.galleryEmpty}>
                <Feather name="shopping-bag" size={48} color={textMuted} />
              </View>
            )}

            {/* Page dots */}
            {images.length > 1 && (
              <View style={styles.dotsRow}>
                {images.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === activeImg
                        ? { backgroundColor: "#FFF", width: 7 }
                        : { backgroundColor: "rgba(255,255,255,0.5)", width: 6 },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* ── Name + price ─────────────────────────────────────────────── */}
          <View style={[styles.metaBlock, lang === "ar" && { alignItems: "flex-end" }]}>
            <Text style={[styles.vendorText, { color: textMuted }, lang === "ar" && { textAlign: "right" }]}>
              {product.vendor ?? "Mora"}
            </Text>
            <Text style={[styles.titleText, { color: textPri }, lang === "ar" && { textAlign: "right" }]} numberOfLines={2}>
              {product.title}
            </Text>
            <Text style={[styles.priceText, { color: PRIMARY }]}>
              {formatIQD(product.price)}
            </Text>
          </View>

          {/* ── Variants ─────────────────────────────────────────────────── */}
          {(hasOpt1 || hasOpt2) && (
            <View style={[styles.optionsWrap, { borderTopColor: divider }]}>
              {hasOpt1 && (isOpt1Color && opt1Def?.colorEntries
                ? renderColorChips(opt1Def.colorEntries, opt1Values, selectedOpt1, (v) => { setSelectedOpt1(v); setSelectedOpt2(null); }, isOpt1OOS, label1)
                : renderChips(opt1Values, selectedOpt1, (v) => { setSelectedOpt1(v); setSelectedOpt2(null); }, isOpt1OOS, label1)
              )}
              {hasOpt2 && (isOpt2Color && opt2Def?.colorEntries
                ? renderColorChips(opt2Def.colorEntries, opt2Values, selectedOpt2, setSelectedOpt2, isOpt2OOS, label2)
                : renderChips(opt2Values, selectedOpt2, setSelectedOpt2, isOpt2OOS, label2)
              )}
            </View>
          )}

          {/* ── Quantity stepper ─────────────────────────────────────────── */}
          {!fullyOOS && (
            <View style={[styles.qtySection, { borderTopColor: divider }, lang === "ar" && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.qtyLabel, { color: textMuted }]}>
                {lang === "ar" ? "الكمية" : "QUANTITY"}
              </Text>
              <View style={styles.qtyStepper}>
                <Pressable
                  style={[styles.qtyBtn, quantity <= 1 && { opacity: 0.3 }]}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  hitSlop={8}
                >
                  <Feather name="minus" size={14} color={textPri} />
                </Pressable>
                <Text style={[styles.qtyNum, { color: textPri }]}>{quantity}</Text>
                <Pressable
                  style={[styles.qtyBtn, quantity >= maxStock && { opacity: 0.3 }]}
                  onPress={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                  disabled={quantity >= maxStock}
                  hitSlop={8}
                >
                  <Feather name="plus" size={14} color={textPri} />
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Action row: Add to Bag + Favorite ─────────────────────────── */}
        <View style={[styles.actionRow, lang === "ar" && { flexDirection: "row-reverse" }]}>
          <Pressable
            style={({ pressed }) => [styles.heartBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={handleHeart}
            hitSlop={8}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={26}
              color={liked ? PRIMARY : textPri}
            />
          </Pressable>

          {fullyOOS ? (
            <Pressable
              style={({ pressed }) => [
                styles.addBtn,
                styles.notifyBtn,
                {
                  backgroundColor: notified ? "#43A047" : "#3A3A3C",
                  opacity: pressed && !notified ? 0.88 : 1,
                },
              ]}
              onPress={notified ? undefined : handleNotify}
              disabled={notified || notifying}
            >
              {notifying ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Feather name={notified ? "check" : "bell"} size={16} color="#FFF" />
                  <Text style={[styles.addBtnText, { color: "#FFF" }]}>
                    {notified
                      ? (lang === "ar" ? "راح نبلغك" : "We'll notify you")
                      : (lang === "ar" ? "ابلغني عند توفره" : "Notify me")}
                  </Text>
                </>
              )}
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.addBtn,
                {
                  backgroundColor: canAdd
                    ? PRIMARY
                    : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={handleAdd}
              disabled={!canAdd}
            >
              <Text style={[styles.addBtnText, { color: canAdd ? "#FFF" : textMuted }]}>
                {btnLabel}
              </Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "90%",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingTop: 12,
    paddingBottom: 44,
    paddingHorizontal: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  gallery: {
    width: GALLERY_W,
    height: GALLERY_H,
    borderRadius: 0,
    overflow: "hidden",
    position: "relative",
  },
  galleryEmpty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  metaBlock: {
    gap: 4,
    paddingTop: 16,
    paddingBottom: 4,
  },
  vendorText: {
    fontFamily: "Cairo_500Medium",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  titleText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 17,
    lineHeight: 22,
  },
  priceText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 17,
    marginTop: 2,
  },
  optionsWrap: {
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 16,
    gap: 18,
  },
  axisWrap: {
    gap: 10,
  },
  axisLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 0,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 52,
    position: "relative",
    overflow: "hidden",
  },
  chipText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
  },
  strikeThrough: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(150,150,150,0.6)",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 16,
  },
  heartBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    flex: 1,
    borderRadius: 0,
    paddingVertical: 16,
    alignItems: "center",
  },
  notifyBtn: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  addBtnText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  qtySection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    marginTop: 16,
    paddingTop: 14,
  },
  qtyLabel: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  qtyStepper: {
    flexDirection: "row",
    alignItems: "center",
  },
  qtyBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyNum: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
    minWidth: 30,
    textAlign: "center",
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    marginRight: 8,
    position: "relative",
  },
  colorSwatchRing: {
    position: "absolute",
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.75)",
  },
});
