import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { fetchStories, fetchSpecialCollection } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import { StoriesSection } from "@/components/StoriesSection";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import type { CartItem, Product, Variant } from "@/lib/types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRIMARY = "#0274C1";
const FREE_SHIP_THRESHOLD = 75000;

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepBar({ current, isDark, lang }: { current: 1 | 2 | 3; isDark: boolean; lang: string }) {
  const isAr = lang === "ar";
  const steps = isAr ? ["السلة", "الدفع", "تم"] : ["CART", "CHECKOUT", "DONE"];
  const dimText = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.22)";
  const dimLine = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";

  return (
    <View style={[sb.row, isAr && { flexDirection: "row-reverse" }]}>
      {steps.map((label, i) => {
        const step = i + 1;
        const active = step === current;
        const done = step < current;
        return (
          <React.Fragment key={label}>
            <View style={sb.item}>
              <View style={[sb.dot, active && sb.dotActive, done && sb.dotDone]}>
                {done
                  ? <Feather name="check" size={13} color={PRIMARY} />
                  : <Text style={[sb.dotNum, { color: active ? PRIMARY : dimText }]}>{step}</Text>}
              </View>
              <Text style={[sb.lbl, { color: active ? PRIMARY : dimText }, active && { fontWeight: "800" }]}>
                {label}
              </Text>
            </View>
            {i < 2 && <View style={[sb.line, { backgroundColor: done ? PRIMARY : dimLine }]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const sb = StyleSheet.create({
  row:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, marginTop: 8, marginBottom: 6 },
  item:     { alignItems: "center", gap: 4 },
  dot:      { alignItems: "center", justifyContent: "center", paddingVertical: 2 },
  dotActive:{},
  dotDone:  {},
  dotNum:   { fontSize: 13, fontWeight: "800" },
  lbl:      { fontSize: 9, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" },
  line:     { flex: 1, height: 1.5, marginBottom: 14 },
});

// ─── Free Shipping Bar ────────────────────────────────────────────────────────

function FreeShippingBar({ subtotal, isDark, lang }: { subtotal: number; isDark: boolean; lang: string }) {
  const isAr = lang === "ar";
  const remaining = Math.max(0, FREE_SHIP_THRESHOLD - subtotal);
  const pct = Math.min(1, subtotal / FREE_SHIP_THRESHOLD);
  const isFree = remaining === 0;
  const barBg = isDark ? "#1E1E1E" : "#EBEBEB";

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}>
      <View style={[fs.track, { backgroundColor: barBg }]}>
        <View style={[fs.fill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: PRIMARY }]} />
      </View>
      <Text style={[fs.txt, { color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)" }, isAr && { textAlign: "right" }]}>
        {isFree
          ? (isAr ? "🎉 حصلت على شحن مجاني!" : "🎉 You've unlocked free shipping!")
          : isAr
            ? `أنت على بُعد ${formatIQD(remaining)} من **التوصيل المجاني**`
            : `You're ${formatIQD(remaining)} away from `}
        {!isFree && !isAr && <Text style={{ fontWeight: "800", color: isDark ? "#fff" : "#111" }}>free shipping</Text>}
      </Text>
    </View>
  );
}

const fs = StyleSheet.create({
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill:  { height: "100%", borderRadius: 2 },
  txt:   { fontSize: 12, marginTop: 7, lineHeight: 17 },
});

// ─── Cart Item Row ────────────────────────────────────────────────────────────

function CartItemRow({
  item, isDark, onRemove, onInc, onDec, lang,
}: {
  item: CartItem; isDark: boolean;
  onRemove: () => void; onInc: () => void; onDec: () => void; lang: string;
}) {
  const isAr = lang === "ar";
  const swipeRef = useRef<SwipeableMethods>(null);
  const textCol = isDark ? "#FFFFFF" : "#111111";
  const sub     = isDark ? "rgba(255,255,255,0.45)" : "#888888";
  const divClr  = isDark ? "#1A1A1A" : "#EBEBEB";

  const renderSwipeAction = (progress: SharedValue<number>) => {
    const AnimatedContent = () => {
      const style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1], "clamp") }],
        opacity: interpolate(progress.value, [0, 0.5], [0, 1], "clamp"),
        alignItems: "center" as const,
      }));
      return (
        <View style={ci.swipeOuter}>
          <Pressable style={ci.swipeBtn} onPress={() => { swipeRef.current?.close(); onRemove(); }}>
            <Animated.View style={style}>
              <Feather name="trash-2" size={18} color="#fff" />
              <Text style={ci.swipeLbl}>{isAr ? "حذف" : "REMOVE"}</Text>
            </Animated.View>
          </Pressable>
        </View>
      );
    };
    return <AnimatedContent />;
  };

  const hasDiscount = item.comparePrice && item.comparePrice > item.price;

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      renderRightActions={isAr ? undefined : renderSwipeAction}
      renderLeftActions={isAr ? renderSwipeAction : undefined}
      rightThreshold={48}
      leftThreshold={48}
      overshootRight={false}
      overshootLeft={false}
    >
      <View style={[ci.row, { borderBottomColor: divClr }, isAr && { flexDirection: "row-reverse" }]}>
        {/* Product image */}
        <View style={ci.imgWrap}>
          {item.image
            ? <Image source={{ uri: item.image }} style={ci.img} contentFit="cover" />
            : <View style={[ci.img, { backgroundColor: isDark ? "#222" : "#F0F0F0", alignItems: "center", justifyContent: "center" }]}>
                <Feather name="image" size={20} color={sub} />
              </View>}
        </View>

        {/* Info */}
        <View style={{ flex: 1, alignItems: isAr ? "flex-end" : "flex-start", gap: 4 }}>
          <Text style={[ci.title, { color: textCol }]} numberOfLines={2}>{item.title}</Text>
          {(item.size || item.color) && (
            <Text style={[ci.variant, { color: sub }]}>
              {[item.size, item.color].filter(Boolean).join("   ")}
            </Text>
          )}
          <View style={[ci.priceRow, isAr && { flexDirection: "row-reverse" }]}>
            <Text style={ci.price}>{formatIQD(item.price)}</Text>
            {hasDiscount && (
              <Text style={[ci.comparePrice, { color: sub }]}>{formatIQD(item.comparePrice!)}</Text>
            )}
          </View>
        </View>

        {/* Qty controls — vertical column on the right */}
        <View style={ci.qtyCol}>
          <Pressable onPress={onInc} style={ci.qColBtn} hitSlop={8}>
            <Feather name="plus" size={13} color={textCol} />
          </Pressable>
          <Text style={[ci.qColNum, { color: textCol }]}>{item.quantity}</Text>
          <Pressable onPress={onDec} style={ci.qColBtn} hitSlop={8}>
            <Feather
              name={item.quantity === 1 ? "trash-2" : "minus"}
              size={13}
              color={item.quantity === 1 ? "#EF4444" : textCol}
            />
          </Pressable>
        </View>
      </View>
    </ReanimatedSwipeable>
  );
}

const ci = StyleSheet.create({
  row:         { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  imgWrap:     { width: 80, height: 100, borderRadius: 0, overflow: "hidden", flexShrink: 0 },
  img:         { width: "100%", height: "100%" },
  title:       { fontSize: 13, fontWeight: "700", lineHeight: 18, letterSpacing: -0.1 },
  variant:     { fontSize: 11, fontWeight: "500", letterSpacing: 0.2 },
  priceRow:    { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  price:       { fontSize: 14, fontWeight: "800", color: PRIMARY },
  comparePrice:{ fontSize: 12, fontWeight: "500", textDecorationLine: "line-through" },
  qtyCol:      { alignItems: "center", justifyContent: "space-between", paddingVertical: 4, gap: 6, minWidth: 32 },
  qColBtn:     { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  qColNum:     { fontSize: 14, fontWeight: "800", textAlign: "center", minWidth: 24 },
  swipeOuter:  { width: 76, marginBottom: 1 },
  swipeBtn:    { flex: 1, backgroundColor: "#EF4444", borderRadius: 0, alignItems: "center", justifyContent: "center" },
  swipeLbl:    { color: "#fff", fontSize: 9, fontWeight: "700", letterSpacing: 0.5, marginTop: 4 },
});

// ─── Also Bought Section ──────────────────────────────────────────────────────

function AlsoBoughtSection({ lang, isDark }: { lang: string; isDark: boolean }) {
  const { addItem, items: cartItems } = useCart();
  const router = useRouter();
  const isAr = lang === "ar";

  const [sheetProduct, setSheetProduct] = useState<Product | null>(null);

  const { data } = useQuery({
    queryKey: ["also-bought"],
    queryFn:  () => fetchSpecialCollection("trends"),
    retry: false,
    staleTime: 300_000,
  });

  const products = (data?.products ?? []).slice(0, 8);
  if (!products.length) return null;

  const textCol    = isDark ? "#FFFFFF" : "#111111";
  const cardBg     = isDark ? "#141414" : "#F7F7F7";
  const divider    = isDark ? "#1A1A1A" : "#EBEBEB";
  const hdrDivider = isDark ? "#1F1F1F" : "#DCDCDC";

  const handleConfirm = (variant: Variant, qty: number) => {
    const p = sheetProduct;
    if (!p) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    addItem({
      productId: p.id,
      variantId: variant.id,
      title:     p.title,
      vendor:    p.vendor ?? "",
      price:     variant.price,
      quantity:  qty,
      image:     p.images?.[0],
      size:      variant.size,
      color:     variant.color,
    });
    setSheetProduct(null);
  };

  return (
    <View style={{ marginTop: 6 }}>
      <View style={[ab.hdrRow, { borderTopColor: hdrDivider, borderBottomColor: hdrDivider }]}>
        <Text style={[ab.hdr, { color: textCol }]}>
          {isAr ? "اشترى معه أيضًا" : "OTHERS ALSO BOUGHT"}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[ab.scroll, isAr && { flexDirection: "row-reverse" }]}
        decelerationRate="fast"
        snapToInterval={130}
      >
        {products.map((product) => {
          const inCart = cartItems.some((i) => i.productId === product.id);
          return (
            <Pressable
              key={product.id}
              style={[ab.card, { backgroundColor: cardBg }]}
              onPress={() => router.push(`/product/${product.id}` as any)}
            >
              <Image
                source={{ uri: product.images?.[0] ?? "" }}
                style={ab.cardImg}
                contentFit="cover"
              />
              <View style={ab.cardBody}>
                <Text style={[ab.cardPrice, { color: textCol }]}>{formatIQD(product.price)}</Text>
                <Pressable
                  onPress={(e) => { e.stopPropagation?.(); if (!inCart) setSheetProduct(product); }}
                  hitSlop={10}
                  style={ab.addIconBtn}
                >
                  <Feather
                    name={inCart ? "check" : "plus"}
                    size={18}
                    color={inCart ? "#22C55E" : PRIMARY}
                  />
                </Pressable>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ height: 1, backgroundColor: divider, marginTop: 4 }} />

      <QuickAddSheet
        visible={sheetProduct !== null}
        product={sheetProduct}
        onClose={() => setSheetProduct(null)}
        onConfirm={handleConfirm}
      />
    </View>
  );
}

const ab = StyleSheet.create({
  hdrRow:   { borderTopWidth: 1, borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  hdr:      { fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  scroll:   { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  card:     { width: 118, borderRadius: 4, overflow: "hidden" },
  cardImg:  { width: 118, height: 140 },
  cardBody: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 8 },
  cardPrice:{ fontSize: 12, fontWeight: "700" },
  addIconBtn: { padding: 4, alignItems: "center", justifyContent: "center" },
});

// ─── Gift Section (restyled) ──────────────────────────────────────────────────

function GiftSection({ lang, isDark }: { lang: string; isDark: boolean }) {
  const { addItem, items: cartItems } = useCart();
  const isAr = lang === "ar";
  const [sheetProduct, setSheetProduct] = useState<Product | null>(null);

  const { data } = useQuery({
    queryKey: ["gift-wrapping"],
    queryFn:  () => fetchSpecialCollection("gift-wrapping"),
    retry: false, staleTime: 300_000,
  });

  const products = data?.products ?? [];
  if (!products.length) return null;

  const textCol = isDark ? "#fff" : "#111";
  const bg      = isDark ? "#141414" : "#F7F7F7";
  const divider = isDark ? "#1A1A1A" : "#EBEBEB";

  const handleConfirm = (variant: Variant, qty: number) => {
    const p = sheetProduct;
    if (!p) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    addItem({ productId: p.id, variantId: variant.id, title: p.title, vendor: p.vendor ?? "", price: variant.price, quantity: qty, image: p.images?.[0], size: variant.size, color: variant.color });
    setSheetProduct(null);
  };

  return (
    <View style={{ marginBottom: 6 }}>
      <View style={[ab.hdrRow, { borderTopColor: divider, borderBottomColor: divider, flexDirection: isAr ? "row-reverse" : "row", alignItems: "center", gap: 8 }]}>
        <Feather name="gift" size={13} color={PRIMARY} />
        <Text style={[ab.hdr, { color: textCol }]}>{isAr ? "ارسل كهدية" : "BUY AS A GIFT"}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={[ab.scroll, isAr && { flexDirection: "row-reverse" }]}
        decelerationRate="fast" snapToInterval={130}
      >
        {products.map((p) => {
          const inCart = cartItems.some((i) => i.productId === p.id);
          return (
            <View key={p.id} style={[ab.card, { backgroundColor: bg }]}>
              <Image source={{ uri: p.images?.[0] ?? "" }} style={ab.cardImg} contentFit="cover" />
              <View style={ab.cardBody}>
                <Text style={[ab.cardPrice, { color: textCol }]}>{formatIQD(p.price)}</Text>
                <Pressable hitSlop={10} style={ab.addIconBtn} onPress={() => { if (!inCart) setSheetProduct(p); }}>
                  <Feather name={inCart ? "check" : "plus"} size={18} color={inCart ? "#22C55E" : PRIMARY} />
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <QuickAddSheet
        visible={sheetProduct !== null}
        product={sheetProduct}
        onClose={() => setSheetProduct(null)}
        onConfirm={handleConfirm}
      />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CartScreen() {
  const { items, subtotal, removeItem, updateQty } = useCart();
  const { user }    = useAuth();
  const { lang }    = useLanguage();
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const { resolvedScheme } = useTheme();
  const isDark      = resolvedScheme === "dark";

  const { data: storyData, isLoading: storiesLoading } = useQuery({
    queryKey: ["cart-stories"],
    queryFn:  fetchStories,
    enabled:  items.length === 0,
    staleTime: 120_000,
  });
  const storyRows = storyData ?? [];

  const bg      = isDark ? "#0A0A0A" : "#FFFFFF";
  const textCol = isDark ? "#FFFFFF" : "#111111";
  const sub     = isDark ? "rgba(255,255,255,0.45)" : "#888888";
  const divider = isDark ? "#1A1A1A" : "#EBEBEB";
  const barBg   = isDark ? "#0A0A0A" : "#FFFFFF";
  const isWeb   = Platform.OS === "web";
  const barBottom = isWeb ? 74 : insets.bottom + 8;

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  const handleRemove = useCallback((productId: string, variantId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeItem(productId, variantId);
  }, [removeItem]);

  const handleDec = useCallback((productId: string, variantId: string, qty: number) => {
    if (qty <= 1) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      removeItem(productId, variantId);
    } else {
      Haptics.selectionAsync();
      updateQty(productId, variantId, -1);
    }
  }, [removeItem, updateQty]);

  const handleInc = useCallback((productId: string, variantId: string) => {
    Haptics.selectionAsync();
    updateQty(productId, variantId, 1);
  }, [updateQty]);

  const handleCheckout = () => {
    if (!user) {
      router.push({ pathname: "/auth", params: { returnTo: "/checkout" } });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/checkout");
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <View style={[s.root, { backgroundColor: bg, paddingTop: insets.top }]}>
        <View style={[s.header, { borderBottomColor: divider }]}>
          <Text style={[s.pageTitle, { color: textCol }]}>
            {lang === "ar" ? "سلتي" : "MY CART"}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 100 }}
        >
          {storiesLoading
            ? <ActivityIndicator color={PRIMARY} style={{ marginTop: 48 }} />
            : <StoriesSection rows={storyRows} circlesOnly />}

          <View style={s.emptyWrap}>
            <View style={[s.emptyIcon, { borderColor: divider }]}>
              <Feather name="shopping-bag" size={32} color={sub} />
            </View>
            <Text style={[s.emptyTitle, { color: textCol }]}>
              {lang === "ar" ? "سلتك فارغة" : "Your cart is empty"}
            </Text>
            <Text style={[s.emptySub, { color: sub }]}>
              {lang === "ar" ? "تصفّح منتجاتنا واكتشف تشكيلاتنا" : "Browse our collections and discover our range"}
            </Text>
            <Pressable
              style={[s.browseBtn, { borderColor: isDark ? "#333" : "#111" }]}
              onPress={() => router.push("/" as any)}
            >
              <Text style={[s.browseTxt, { color: textCol }]}>
                {lang === "ar" ? "تسوق الآن" : "SHOP NOW"}
              </Text>
              <Feather name={lang === "ar" ? "arrow-left" : "arrow-right"} size={14} color={textCol} />
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Filled cart ────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 6, borderBottomColor: divider }]}>
        <View style={[s.headerInner, lang === "ar" && { flexDirection: "row-reverse" }]}>
          <Text style={[s.pageTitle, { color: textCol }]}>
            {lang === "ar" ? "سلتي" : "YOUR CART"}
          </Text>
        </View>
      </View>

      {/* Step indicator */}
      <StepBar current={1} isDark={isDark} lang={lang} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isWeb ? 150 : insets.bottom + 90 }}
      >
        {/* Free shipping progress */}
        <FreeShippingBar subtotal={subtotal} isDark={isDark} lang={lang} />

        {/* Top divider */}
        <View style={{ height: 1, backgroundColor: divider }} />

        {/* Cart items */}
        {items.map((item) => (
          <CartItemRow
            key={`${item.productId}-${item.variantId}`}
            item={item}
            isDark={isDark}
            lang={lang}
            onRemove={() => handleRemove(item.productId, item.variantId)}
            onInc={() => handleInc(item.productId, item.variantId)}
            onDec={() => handleDec(item.productId, item.variantId, item.quantity)}
          />
        ))}

        {/* Also bought */}
        <AlsoBoughtSection lang={lang} isDark={isDark} />

        {/* Gift section */}
        <GiftSection lang={lang} isDark={isDark} />

      </ScrollView>

      {/* Bottom checkout bar */}
      <View style={[
        s.bar,
        {
          backgroundColor: barBg,
          borderTopColor: divider,
          bottom: barBottom,
        },
      ]}>
        {/* Total row */}
        <View style={[s.totalRow, lang === "ar" && { flexDirection: "row-reverse" }]}>
          <Text style={[s.totalLbl, { color: textCol }]}>
            {lang === "ar" ? "المجموع:" : "TOTAL:"}
          </Text>
          <Text style={[s.totalAmt, { color: textCol }]}>{formatIQD(subtotal)}</Text>
        </View>
        {/* Checkout button */}
        <Pressable
          onPress={handleCheckout}
          style={({ pressed }) => [s.checkBtn, pressed && { opacity: 0.82 }]}
        >
          <Feather name="lock" size={14} color="#fff" />
          <Text style={s.checkTxt}>
            {lang === "ar" ? "إتمام الشراء بأمان" : "SECURE CHECKOUT"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1 },
  header:       { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12 },
  headerInner:  { flexDirection: "row", alignItems: "center" },
  pageTitle:    { fontSize: 20, fontWeight: "900", letterSpacing: -0.3, textTransform: "uppercase" },
  superscript:  { fontSize: 13, fontWeight: "700", lineHeight: 24 },
  emptyWrap:    { flex: 1, alignItems: "center", paddingHorizontal: 40, paddingVertical: 40, gap: 12 },
  emptyIcon:    { width: 80, height: 80, borderRadius: 40, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  emptyTitle:   { fontSize: 18, fontWeight: "800", letterSpacing: -0.3, textAlign: "center" },
  emptySub:     { fontSize: 13, textAlign: "center", lineHeight: 19 },
  browseBtn:    { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 4, marginTop: 8 },
  browseTxt:    { fontSize: 13, fontWeight: "700", letterSpacing: 0.8 },
  bar:          { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, gap: 10 },
  totalRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalLbl:     { fontSize: 14, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  totalAmt:     { fontSize: 18, fontWeight: "900", letterSpacing: -0.4 },
  checkBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: PRIMARY, paddingVertical: 15, borderRadius: 4 },
  checkTxt:     { color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
});
