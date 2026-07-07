import React, { useState, useRef, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { MoraLogo } from "@/components/MoraLogo";
import { GlassBackButton } from "@/components/GlassBackButton";
import { fetchProduct, fetchRelatedProducts, fetchContentSections } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { requestRestockNotify, fetchRestockRequests } from "@/lib/api";
import { LiquidGlassBg, isIOS26Plus } from "@/components/LiquidGlassBg";
import { BlurView } from "expo-blur";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import { ShippingRulesNote } from "@/components/ShippingRulesNote";
import { ReelPlayer } from "@/components/ReelPlayer";
import RenderHtml from "react-native-render-html";
import type { ContentSectionItem } from "@/lib/api";
import type { Variant, Product } from "@/lib/types";

const PRIMARY = "#0274C1";
const GOLD = "#C9922A";
const SILVER = "#7D8A9A";

const CARD_COLORS = [
  "#E8EDF5", "#F0EBE3", "#E8F0E8", "#F5EDEB",
  "#EBF0F5", "#F5EBF5", "#FFF3E0", "#F0F0F0",
];

function cardColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CARD_COLORS[h % CARD_COLORS.length];
}

// ─── Accordion Section ─────────────────────────────────────────────────────────
function AccordionSection({
  title,
  children,
  colors,
  initialOpen = false,
  isAr = false,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  initialOpen?: boolean;
  isAr?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <View style={[styles.accordionWrap, { borderTopColor: colors.border }]}>
      <Pressable
        style={[styles.accordionHeader, isAr && { flexDirection: "row-reverse" }]}
        onPress={() => setOpen((o) => !o)}
      >
        <Text style={[styles.accordionTitle, { color: colors.foreground }]}>{title}</Text>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.mutedForeground}
        />
      </Pressable>
      {open && <View style={[styles.accordionBody, isAr && { alignItems: "flex-end" }]}>{children}</View>}
    </View>
  );
}

// ─── Text Paragraph ────────────────────────────────────────────────────────────
function TextParagraph({
  item,
  colors,
  isBold,
  contentWidth,
}: {
  item: ContentSectionItem;
  colors: ReturnType<typeof useColors>;
  isBold?: boolean;
  contentWidth: number;
}) {
  const content = item.text ?? item.description ?? item.name ?? "";
  if (!content) return null;

  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  const baseColor = isBold ? colors.foreground : colors.mutedForeground;

  if (isHtml) {
    return (
      <RenderHtml
        contentWidth={contentWidth}
        source={{ html: content }}
        baseStyle={{
          color: baseColor,
          fontFamily: isBold ? "Inter_600SemiBold" : "Inter_400Regular",
          fontSize: 14,
          lineHeight: 22,
        }}
        tagsStyles={{
          p: { marginTop: 0, marginBottom: 8 },
          strong: { fontFamily: "Inter_600SemiBold" },
          b: { fontFamily: "Inter_600SemiBold" },
        }}
        enableExperimentalMarginCollapsing
      />
    );
  }

  return (
    <Text
      style={[
        styles.textParagraph,
        { color: baseColor },
        isBold && { fontFamily: "Inter_600SemiBold" },
      ]}
    >
      {content}
    </Text>
  );
}

// ─── Related Product Card (grid 2-col) ────────────────────────────────────────
function RelatedCard({
  product,
  colors,
  cardWidth,
  onQuickAdd,
}: {
  product: Product;
  colors: ReturnType<typeof useColors>;
  cardWidth: number;
  onQuickAdd: (p: Product) => void;
}) {
  const router = useRouter();
  const { lang } = useLanguage();
  const bg = cardColor(product.id);
  const hasDiscount =
    product.comparePrice != null && product.comparePrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(
        ((product.comparePrice! - product.price) / product.comparePrice!) * 100
      )
    : 0;

  return (
    <Pressable
      style={[styles.relatedCard, { width: cardWidth, backgroundColor: colors.background, borderColor: colors.border }]}
      onPress={() => router.push(`/product/${product.id}`)}
    >
      <View style={[styles.relatedImg, { width: cardWidth, height: cardWidth * 1.25, backgroundColor: bg }]}>
        <Image
          source={{ uri: product.images?.[0] }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        {discountPct > 0 && (
          <View style={styles.relatedDisc}>
            <Text style={styles.relatedDiscText}>-{discountPct}%</Text>
          </View>
        )}
      </View>
      <View style={styles.relatedInfo}>
        <Text style={[styles.relatedTitle, { color: colors.foreground }]} numberOfLines={2}>
          {product.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={[styles.relatedPrice, { color: PRIMARY }]}>
            {formatIQD(product.price)}
          </Text>
          {hasDiscount && (
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: "#E53935", textDecorationLine: "line-through" }}>
              {formatIQD(product.comparePrice!)}
            </Text>
          )}
        </View>
        <Pressable
          style={styles.relatedAddBtn}
          onPress={(e) => { e.stopPropagation?.(); onQuickAdd(product); }}
        >
          <Text style={styles.relatedAddText}>{lang === "ar" ? "اضفه لسلتي" : "ADD TO BAG"}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function ProductDetailSkeleton({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <>
      <View style={[styles.imageBox, { backgroundColor: "#F0F0F0" }]} />
      <View style={{ padding: 20, gap: 14 }}>
        <View style={{ height: 12, width: 80, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 20, width: "80%", backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 20, width: 100, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 12, width: "60%", backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          {[60, 60, 60, 60].map((w, i) => (
            <View key={i} style={{ height: 44, width: w, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
          ))}
        </View>
      </View>
    </>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { addItem, totalItems } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const { token } = useAuth();
  const { lang } = useLanguage();
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [quickAddRelated, setQuickAddRelated] = useState<Product | null>(null);
  const [notifyingVariant, setNotifyingVariant] = useState<string | null>(null);
  const [locallyNotified, setLocallyNotified] = useState<string[]>([]);

  useEffect(() => { setQty(1); }, [selectedVariant?.id]);

  const topPadding = isWeb ? 0 : insets.top;
  const bottomPadding = isWeb ? 0 : insets.bottom;

  const { data: product, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id!),
    enabled: !!id,
  });

  const { data: contentSections } = useQuery({
    queryKey: ["content-sections"],
    queryFn: fetchContentSections,
    staleTime: 300_000,
  });

  const [relatedItems, setRelatedItems] = useState<Product[]>([]);
  const [relatedPage, setRelatedPage]   = useState(0);
  const [relatedTotal, setRelatedTotal] = useState(0);
  const [loadingMore, setLoadingMore]   = useState(false);
  const relatedReady = useRef(false);

  const loadRelatedPage = useCallback(async (pageNum: number) => {
    if (!id || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchRelatedProducts(id as string, pageNum, 8);
      setRelatedItems((prev) => pageNum === 1 ? res.products : [...prev, ...res.products]);
      setRelatedTotal(res.total);
      setRelatedPage(pageNum);
    } catch {}
    setLoadingMore(false);
  }, [id, loadingMore]);

  useEffect(() => {
    if (!id || relatedReady.current) return;
    relatedReady.current = true;
    loadRelatedPage(1);
  }, [id]);

  const hasMoreRelated = relatedItems.length < relatedTotal;

  const handleScroll = useCallback((e: { nativeEvent: { layoutMeasurement: { height: number }; contentOffset: { y: number }; contentSize: { height: number } } }) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 500;
    if (nearBottom && hasMoreRelated && !loadingMore) {
      loadRelatedPage(relatedPage + 1);
    }
  }, [hasMoreRelated, loadingMore, relatedPage, loadRelatedPage]);

  useEffect(() => {
    if (!product) return;
    AsyncStorage.getItem("mora_views").then((raw) => {
      const views = JSON.parse(raw || "[]") as { id: string; tags: string[]; gender: string }[];
      const filtered = views.filter((v) => v.id !== product.id);
      filtered.unshift({ id: product.id, tags: (product.tags as string[] | null) ?? [], gender: (product as unknown as Record<string, string>)["gender"] ?? "all" });
      if (filtered.length > 20) filtered.splice(20);
      AsyncStorage.setItem("mora_views", JSON.stringify(filtered)).catch(() => {});
    }).catch(() => {});
  }, [product?.id]);

  const { data: subscribedVariantIds = [], refetch: refetchSubs } = useQuery({
    queryKey: ["restock-subs"],
    queryFn: () => fetchRestockRequests(token!),
    enabled: !!token,
    staleTime: 60_000,
  });

  const liked = product ? isWishlisted(product.id) : false;
  const activeVariant = selectedVariant ?? (product?.variants?.[0] ?? null);
  const activeOOS = !!activeVariant && (activeVariant.inventory ?? 0) <= 0;
  const isSubscribed =
    !!activeVariant &&
    (subscribedVariantIds.includes(activeVariant.id) || locallyNotified.includes(activeVariant.id));
  const price = activeVariant?.price ?? product?.price ?? 0;
  const comparePrice = product?.comparePrice;
  const hasDiscount = comparePrice != null && comparePrice > price;
  const bg = product ? cardColor(product.id) : "#F0F0F0";
  const { width: screenWidth } = useWindowDimensions();
  const imgSize = Math.min(screenWidth, 600);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const imageUri = product?.images?.[0];

  const warranty = contentSections?.warranty;
  const testimonials = contentSections?.testimonials;
  const cardWidth = Math.floor((Math.min(screenWidth, 600) - 32 - 8) / 2);

  const handleAddToCart = () => {
    if (!product) return;
    const variant = activeVariant ?? product.variants?.[0];
    addItem({
      productId: product.id,
      variantId: variant?.id ?? product.id,
      title: product.title,
      vendor: product.vendor ?? "Mora",
      price: variant?.price ?? product.price,
      quantity: qty,
      size: variant?.option1,
      color: variant?.option2,
      image: imageUri,
    });
    setQty(1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleNotifyRestock = async () => {
    if (!product || !activeVariant) return;
    if (!token) {
      // react-native-web's Alert.alert is a no-op, so the login prompt must use
      // window.confirm on web; native keeps the styled Alert dialog.
      if (isWeb) {
        const ok = window.confirm(
          lang === "ar"
            ? "سجّل دخولك حتى نبلغك عند توفر المنتج. تسجيل الدخول الآن؟"
            : "Sign in so we can notify you when it's back in stock. Sign in now?",
        );
        if (ok) router.push("/auth");
      } else {
        Alert.alert(
          lang === "ar" ? "تحتاج تسجيل دخول" : "Sign in required",
          lang === "ar"
            ? "سجّل دخولك حتى نبلغك عند توفر المنتج"
            : "Sign in so we can notify you when it's back in stock",
          [
            { text: lang === "ar" ? "إلغاء" : "Cancel", style: "cancel" },
            { text: lang === "ar" ? "تسجيل الدخول" : "Sign in", onPress: () => router.push("/auth") },
          ],
        );
      }
      return;
    }
    try {
      setNotifyingVariant(activeVariant.id);
      await requestRestockNotify(token, product.id, activeVariant.id);
      setLocallyNotified((p) => [...p, activeVariant.id]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchSubs();
    } catch {
      const msg = lang === "ar" ? "صار خطأ، حاول مرة ثانية" : "Something went wrong, please try again";
      if (isWeb) window.alert(msg);
      else Alert.alert(lang === "ar" ? "خطأ" : "Error", msg);
    } finally {
      setNotifyingVariant(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header — floats over image ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 8,
            backgroundColor: "transparent",
            borderBottomWidth: 0,
          },
        ]}
      >
        <GlassBackButton
          color="#FFFFFF"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/");
          }}
        />
        <MoraLogo size="small" />
        <View style={styles.cartBtnWrap}>
          {isIOS26Plus ? (
            <Pressable
              onPress={() => router.push("/cart")}
              style={styles.glassIconBtn}
              testID="cart-header-btn"
            >
              <LiquidGlassBg />
              <Feather name="shopping-bag" size={20} color="#FFFFFF" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push("/cart")}
              style={[styles.glassIconBtn, { backgroundColor: "transparent" }]}
              testID="cart-header-btn"
            >
              {Platform.OS !== "web" && (
                <BlurView
                  style={StyleSheet.absoluteFill}
                  intensity={60}
                  tint={isDark ? "systemThinMaterialDark" : "systemThinMaterial"}
                />
              )}
              <Feather name="shopping-bag" size={20} color="#FFFFFF" />
            </Pressable>
          )}
          {totalItems > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.cartBadgeText}>{totalItems > 9 ? "9+" : totalItems}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding + 100 }}>
          <ProductDetailSkeleton colors={colors} />
        </ScrollView>
      ) : isError ? (
        <View style={styles.errorBox}>
          <Feather name="wifi-off" size={40} color={colors.border} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Could not load product
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={[styles.retryBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.retryText, { color: colors.foreground }]}>Retry</Text>
          </Pressable>
        </View>
      ) : product ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={200}
          onScroll={handleScroll}
          contentContainerStyle={{ paddingBottom: (isWeb ? 200 : bottomPadding + 32) }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />
          }
        >
          {/* ── Product Image Gallery ── */}
          <View style={{ width: imgSize, height: imgSize * 1.35, alignSelf: "center", backgroundColor: bg }}>
            {(product.images?.length ?? 0) > 0 ? (
              <FlatList
                data={product.images}
                keyExtractor={(_, i) => String(i)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / imgSize);
                  setActiveImgIdx(idx);
                }}
                renderItem={({ item }) => (
                  <View style={{ width: imgSize, height: imgSize * 1.35, backgroundColor: bg }}>
                    <Image
                      source={{ uri: item }}
                      style={{ width: imgSize, height: imgSize * 1.35 }}
                      contentFit="cover"
                      transition={300}
                    />
                  </View>
                )}
              />
            ) : (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Feather name="shopping-bag" size={80} color={colors.mutedForeground} />
              </View>
            )}
            {/* Dot indicators */}
            {(product.images?.length ?? 0) > 1 && (
              <View style={styles.dotRow}>
                {product.images!.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === activeImgIdx
                        ? { backgroundColor: "#fff", width: 18 }
                        : { backgroundColor: "rgba(255,255,255,0.5)", width: 6 },
                    ]}
                  />
                ))}
              </View>
            )}
            {/* Wishlist button — below the floating header */}
            <Pressable
              style={[styles.wishlistBtnWrap, { top: topPadding + 66 }]}
              onPress={() => {
                toggle(product.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              {isIOS26Plus ? (
                <View style={styles.wishlistBtnGlass}>
                  <LiquidGlassBg />
                  <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? "#0274C1" : "#FFF"} />
                </View>
              ) : (
                <View style={[styles.wishlistBtnFallback, { backgroundColor: "rgba(255,255,255,0.9)" }]}>
                  <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? "#0274C1" : "#1A1A1A"} />
                </View>
              )}
            </Pressable>
          </View>

          {/* ── Info ── */}
          <View style={styles.infoSection}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {(product as any).rating > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={{ color: "#F59E0B", fontSize: 13, letterSpacing: 1 }}>
                    {"★".repeat(Math.round((product as any).rating))}{"☆".repeat(5 - Math.round((product as any).rating))}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#F59E0B" }}>
                    {((product as any).rating as number).toFixed(1)}
                  </Text>
                  {(product as any).ratingCount > 0 && (
                    <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                      ({((product as any).ratingCount as number).toLocaleString()})
                    </Text>
                  )}
                  <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>·</Text>
                </View>
              )}
              <Text style={[styles.vendor, { color: colors.mutedForeground }]}>
                {product.vendor ?? "Mora"}
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {product.title}
            </Text>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.foreground }]}>
                {formatIQD(price)}
              </Text>
              {hasDiscount && (
                <>
                  <Text style={[styles.comparePrice, { color: "#E53935" }]}>
                    {formatIQD(comparePrice!)}
                  </Text>
                  <View style={[styles.saleBadge, { backgroundColor: "#E53935" }]}>
                    <Text style={styles.saleBadgeText}>SALE</Text>
                  </View>
                </>
              )}
            </View>

          </View>

          {/* ── Variants / SIZE ── */}
          {product.variants && product.variants.some((v) => v.option1 && v.option1 !== "Default Title") && (
            <View style={[styles.variantsSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                {(() => {
                  const def = product.optionDefinitions?.[0];
                  const named = def
                    ? (lang === "ar"
                        ? (def.nameAr || def.nameEn || def.name)
                        : (def.nameEn || def.nameAr || def.name))
                    : null;
                  if (named && named.trim()) return named.trim();
                  return product.variants[0]?.option1
                    ? (lang === "ar" ? "القياس" : "SIZE")
                    : (lang === "ar" ? "الخيارات" : "OPTIONS");
                })()}
              </Text>
              <View style={styles.variantsRow}>
                {product.variants.map((v) => {
                  const isActive = activeVariant?.id === v.id;
                  const outOfStock = v.inventory <= 0;
                  return (
                    <Pressable
                      key={v.id}
                      style={[
                        styles.variantChip,
                        {
                          borderColor: isActive
                            ? "transparent"
                            : (isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.13)"),
                          backgroundColor: isActive ? PRIMARY : "transparent",
                          opacity: outOfStock ? 0.4 : 1,
                        },
                      ]}
                      onPress={() => {
                        if (!outOfStock) {
                          setSelectedVariant(v);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                      disabled={outOfStock}
                    >
                      {/* Glass / blur background for inactive chips */}
                      {!isActive && Platform.OS !== "web" && (
                        <View style={styles.chipGlassBg}>
                          {isIOS26Plus
                            ? <LiquidGlassBg />
                            : <BlurView
                                style={StyleSheet.absoluteFill}
                                intensity={55}
                                tint={isDark ? "systemThinMaterialDark" : "systemThinMaterial"}
                              />
                          }
                        </View>
                      )}
                      <Text style={[styles.variantText, { color: isActive ? "#FFFFFF" : colors.foreground }]}>
                        {v.option1 ?? v.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Add to Bag / Notify me ── */}
          <View style={[styles.addBagSection, { borderTopColor: colors.border }]}>
            {/* Quantity stepper */}
            {!activeOOS && (
              <View style={[styles.qtyWrap, lang === "ar" && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.qtyLabel, { color: colors.mutedForeground }]}>
                  {lang === "ar" ? "الكمية" : "QUANTITY"}
                </Text>
                <View style={[styles.qtyStepper, { borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)", backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
                  <Pressable
                    style={[styles.qtyBtn, qty <= 1 && { opacity: 0.3 }]}
                    onPress={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    hitSlop={4}
                  >
                    <Feather name="minus" size={14} color={colors.foreground} />
                  </Pressable>
                  <Text style={[styles.qtyNum, { color: colors.foreground }]}>{qty}</Text>
                  <Pressable
                    style={[styles.qtyBtn, qty >= (activeVariant?.inventory ?? 99) && { opacity: 0.3 }]}
                    onPress={() => setQty((q) => Math.min(activeVariant?.inventory ?? 99, q + 1))}
                    disabled={qty >= (activeVariant?.inventory ?? 99)}
                    hitSlop={4}
                  >
                    <Feather name="plus" size={14} color={colors.foreground} />
                  </Pressable>
                </View>
              </View>
            )}
            {activeOOS ? (
              <Pressable
                style={({ pressed }) => [
                  styles.addBtn,
                  {
                    backgroundColor: isSubscribed ? "#43A047" : "#3A3A3C",
                    opacity: pressed && !isSubscribed ? 0.88 : 1,
                  },
                ]}
                onPress={isSubscribed ? undefined : handleNotifyRestock}
                disabled={isSubscribed || notifyingVariant === activeVariant?.id}
                testID="notify-restock-btn"
              >
                {notifyingVariant === activeVariant?.id ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name={isSubscribed ? "check" : "bell"} size={18} color="#FFFFFF" />
                    <Text style={styles.addBtnText}>
                      {isSubscribed
                        ? (lang === "ar" ? "راح نبلغك عند توفره" : "We'll notify you")
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
                    backgroundColor: added ? "#43A047" : PRIMARY,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
                onPress={handleAddToCart}
                testID="add-to-bag-btn"
              >
                <Feather name={added ? "check" : "shopping-bag"} size={18} color="#FFFFFF" />
                <Text style={styles.addBtnText}>
                  {added
                    ? (lang === "ar" ? "أُضيف للسلة ✓" : "ADDED TO BAG")
                    : (lang === "ar" ? "اضفه لسلتي" : "ADD TO BAG")}
                </Text>
              </Pressable>
            )}

            {/* Shipping rules */}
            <ShippingRulesNote style={[styles.deliveryRow, { borderTopColor: colors.border }]} />
          </View>

          {/* ── Complete the Set ── */}
          {(product.completeTheSet?.length ?? 0) > 0 && (
            <View style={[styles.sectionWrap, { borderTopColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.foreground }, lang === "ar" && { textAlign: "right" }]}>
                {lang === "ar" ? "اشتري الاوتفت كامل" : "COMPLETE THE SET"}
              </Text>
              <View style={{ gap: 10, paddingHorizontal: 16 }}>
                {product.completeTheSet!.map((item) => {
                  const hasDiscount = item.comparePrice != null && item.comparePrice > item.price;
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.ctsRow, { borderColor: colors.border, backgroundColor: colors.background }, lang === "ar" && { flexDirection: "row-reverse" }]}
                      onPress={() => router.push(`/product/${item.id}`)}
                    >
                      <View style={[styles.ctsImg, { backgroundColor: cardColor(item.id) }]}>
                        <Image
                          source={{ uri: item.images?.[0] }}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                        />
                      </View>
                      <View style={styles.ctsInfo}>
                        <Text style={[styles.ctsTitle, { color: colors.foreground }, lang === "ar" && { textAlign: "right" }]} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={[styles.ctsPrice, { color: PRIMARY }]}>
                            {formatIQD(item.price)}
                          </Text>
                          {hasDiscount && (
                            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: "#E53935", textDecorationLine: "line-through" }}>
                              {formatIQD(item.comparePrice!)}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Pressable
                        style={styles.ctsAddBtn}
                        onPress={(e) => { e.stopPropagation?.(); setQuickAddRelated(item); }}
                      >
                        <Text style={styles.ctsAddText}>{lang === "ar" ? "أضف" : "Add"}</Text>
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Instagram Reel ── */}
          {!!product.videoUrl && (
            <ReelPlayer url={product.videoUrl} colors={colors} />
          )}

          {/* ── Description (accordion) ── */}
          {!!product.description && (
            <AccordionSection
              title={lang === "ar" ? "الوصف" : "DESCRIPTION"}
              colors={colors}
              initialOpen={true}
              isAr={lang === "ar"}
            >
              <Text style={[styles.descText, { color: colors.mutedForeground }, lang === "ar" && { textAlign: "right" }]}>
                {product.description}
              </Text>
            </AccordionSection>
          )}

          {/* ── Warranty ── */}
          {warranty && warranty.items.length > 0 && (
            <AccordionSection
              title={lang === "ar" ? "الضمان" : (warranty.title || "WARRANTY")}
              colors={colors}
              isAr={lang === "ar"}
            >
              <View style={styles.textSection}>
                {warranty.items.map((item) => (
                  <TextParagraph key={item.id} item={item} colors={colors} contentWidth={screenWidth - 40} />
                ))}
              </View>
            </AccordionSection>
          )}

          {/* ── Star Customers ── */}
          {testimonials && testimonials.items.length > 0 && (
            <AccordionSection
              title={lang === "ar" ? "زبائن النجوم ⭐" : (testimonials.title || "STAR CUSTOMERS ⭐")}
              colors={colors}
              isAr={lang === "ar"}
            >
              <View style={styles.textSection}>
                {testimonials.items.map((item, i) => (
                  <TextParagraph key={item.id} item={item} colors={colors} isBold={i === 0} contentWidth={screenWidth - 40} />
                ))}
              </View>
            </AccordionSection>
          )}

          {/* ── Related Products ── */}
          {(relatedItems.length > 0 || loadingMore) && (
            <View style={[styles.sectionWrap, { borderTopColor: colors.border }]}>
              <Text style={[styles.sectionLabel, { color: colors.foreground }, lang === "ar" && { textAlign: "right" }]}>
                {lang === "ar" ? "منتجات ذات صلة" : "RELATED PRODUCTS"}
              </Text>
              <View style={styles.relatedGrid}>
                {relatedItems.map((p) => (
                  <RelatedCard key={p.id} product={p} colors={colors} cardWidth={cardWidth} onQuickAdd={setQuickAddRelated} />
                ))}
              </View>
              {loadingMore && (
                <View style={{ paddingVertical: 20, alignItems: "center" }}>
                  <ActivityIndicator color={PRIMARY} size="small" />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      ) : null}

      {/* ── Floating Tab Bar (web only) ── */}

      {/* ── Quick Add Sheet for related products ── */}
      <QuickAddSheet
        visible={!!quickAddRelated}
        product={quickAddRelated}
        onClose={() => setQuickAddRelated(null)}
        onConfirm={(variant, qty: number) => {
          if (!quickAddRelated) return;
          addItem({
            productId: quickAddRelated.id,
            variantId: variant.id ?? quickAddRelated.id,
            title: quickAddRelated.title,
            vendor: quickAddRelated.vendor ?? "Mora",
            price: variant.price ?? quickAddRelated.price,
            quantity: qty,
            size: variant.option1,
            color: variant.option2,
            image: quickAddRelated.images?.[0],
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setQuickAddRelated(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Header — absolute overlay on top of image */
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  cartHeaderBtn: { padding: 4, position: "relative" },
  cartBtnWrap: {
    position: "relative",
  },
  cartBadge: {
    position: "absolute", top: -4, right: -4,
    minWidth: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  cartBadgeText: { color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_700Bold" },

  /* Error */
  errorBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderRadius: 4 },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  /* Image */
  imageBox: {
    height: 360,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  dotRow: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  wishlistBtnWrap: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  glassIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  wishlistBtnGlass: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  wishlistBtnFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  wishlistBtn: {
    position: "absolute", top: 16, right: 16,
    borderRadius: 24, padding: 10, zIndex: 1,
  },

  /* Info */
  infoSection: { padding: 20, gap: 10 },
  vendor: { fontFamily: "Inter_500Medium", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 28 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  price: { fontFamily: "Inter_700Bold", fontSize: 22 },
  comparePrice: { fontFamily: "Inter_400Regular", fontSize: 16, textDecorationLine: "line-through" },
  saleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2 },
  saleBadgeText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.5 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50, borderWidth: 1 },
  tagText: { fontFamily: "Inter_400Regular", fontSize: 12 },

  /* Variants */
  variantsSection: { paddingHorizontal: 20, paddingVertical: 16, gap: 12, borderTopWidth: 1 },
  variantsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  variantChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 100,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  chipGlassBg: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 100,
    overflow: "hidden",
  },
  variantText: { fontFamily: "Inter_500Medium", fontSize: 14 },

  /* Quantity stepper */
  qtyWrap: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qtyLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  qtyStepper: { flexDirection: "row", alignItems: "center", borderRadius: 999, borderWidth: 1.5, overflow: "hidden" },
  qtyBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  qtyNum: { fontFamily: "Inter_700Bold", fontSize: 15, minWidth: 32, textAlign: "center" },

  /* Add to Bag */
  addBagSection: { paddingHorizontal: 16, paddingVertical: 16, gap: 12, borderTopWidth: 1 },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 16, borderRadius: 100,
  },
  addBtnText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 1 },
  deliveryRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingTop: 12, borderTopWidth: 1,
  },
  deliveryText: { fontFamily: "Inter_400Regular", fontSize: 12, flex: 1 },

  /* Accordion */
  accordionWrap: { borderTopWidth: 1 },
  accordionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
  },
  accordionTitle: { fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 0.8 },
  accordionBody: { paddingHorizontal: 20, paddingBottom: 16 },
  descText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },

  /* Text sections (warranty / star customers) */
  textSection: { gap: 10 },
  textParagraph: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },

  /* Section wrapper */
  sectionWrap: { paddingVertical: 16, borderTopWidth: 1, gap: 12 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 0.8, paddingHorizontal: 20 },

  /* Related Products grid */
  relatedGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16,
  },
  relatedCard: {
    borderRadius: 10, borderWidth: 1, overflow: "hidden",
  },
  relatedImg: { alignItems: "center", justifyContent: "center", position: "relative" },
  relatedDisc: {
    position: "absolute", top: 8, left: 8,
    backgroundColor: "#E53935", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3,
  },
  relatedDiscText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 10 },
  relatedInfo: { padding: 10, gap: 4 },
  relatedAddBtn: {
    backgroundColor: "#0274C1",
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 100,
    marginTop: 8,
  },
  relatedAddText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.8,
  },
  relatedTitle: { fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 17 },
  relatedPrice: { fontFamily: "Inter_700Bold", fontSize: 13 },

  /* Complete the Set */
  ctsRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 10, borderWidth: 1, padding: 10, overflow: "hidden",
  },
  ctsImg: {
    width: 72, height: 90, borderRadius: 6, overflow: "hidden",
    flexShrink: 0, position: "relative",
  },
  ctsInfo: { flex: 1, gap: 4 },
  ctsTitle: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },
  ctsPrice: { fontFamily: "Inter_700Bold", fontSize: 14 },
  ctsAddBtn: {
    backgroundColor: "#111111", paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 100, alignItems: "center", flexShrink: 0,
  },
  ctsAddText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 0.5 },
});
