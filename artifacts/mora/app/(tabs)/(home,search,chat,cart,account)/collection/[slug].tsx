import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { useWishlist } from "@/context/WishlistContext";
import { fetchSpecialCollection, fetchCollection, searchProducts, fetchBrowseProducts, fetchStorySiblings } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import { GlassBackButton } from "@/components/GlassBackButton";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
import type { Product, Variant, StorySibling } from "@/lib/types";

const SIB_CIRCLE = 64;
const SIB_ITEM_W = SIB_CIRCLE + 14;

function SiblingStories({ siblings }: { siblings: StorySibling[] }) {
  const router = useRouter();
  const colors = useColors();
  const { lang } = useLanguage();
  if (!siblings.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.siblingScroll}
      decelerationRate="fast"
    >
      {siblings.map((s) => (
        <Pressable
          key={s.id}
          style={({ pressed }) => [styles.siblingWrap, { opacity: pressed ? 0.75 : 1 }]}
          onPress={() => { if (s.collectionId) router.push(`/collection/${s.collectionId}` as any); }}
        >
          <View style={[styles.siblingCircle, { backgroundColor: colors.secondary }]}>
            {s.imageUrl ? (
              <Image source={{ uri: s.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            ) : null}
          </View>
          <Text style={[styles.siblingLabel, { color: colors.foreground }]} numberOfLines={2}>
            {lang === "ar" && s.titleAr ? s.titleAr : s.title}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const { width } = Dimensions.get("window");
const HERO_H = 260;
const CARD_W = (width - 16 * 3) / 2;
const CARD_COLORS = [
  "#E8EDF5", "#F0EBE3", "#E8F0E8", "#F5EDEB",
  "#EBF0F5", "#F5EBF5", "#FFF3E0", "#F0F0F0",
];
const PRIMARY = "#0274C1";
const SCROLL_THRESHOLD = HERO_H - 70;

function isProductInStock(p: Product): boolean {
  const vs = p.variants ?? [];
  if (vs.length === 0) return true; // no variant info → assume available
  return vs.some((v) => (v.inventory ?? 0) > 0);
}

function ProductCard({ product, onQuickAdd }: { product: Product; onQuickAdd: (p: Product) => void }) {
  const colors = useColors();
  const router = useRouter();
  const { lang } = useLanguage();
  const { ids, toggle } = useWishlist();
  const liked = ids.has(product.id);
  const isAr = lang === "ar";
  const hasDiscount = product.comparePrice && product.comparePrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0;
  const bg = CARD_COLORS[product.id % CARD_COLORS.length] ?? "#F0F0F0";

  return (
    <Pressable
      style={{ width: CARD_W }}
      onPress={() => router.push(`/product/${product.id}`)}
      testID={`product-${product.id}`}
    >
      <ProductImageCarousel
        images={product.images ?? []}
        style={[styles.productImageWrap, { backgroundColor: bg }]}
      >
        {/* Discount badge — top-left */}
        {discountPct > 0 && (
          <View style={[styles.discBadge, isAr ? styles.discBadgeAr : styles.discBadgeEn]}>
            <Text style={styles.discText}>▼ {discountPct}%</Text>
          </View>
        )}
        {/* Heart — top-right, no bg */}
        <Pressable
          style={[styles.heartBtn, isAr ? styles.heartBtnAr : styles.heartBtnEn]}
          onPress={() => { toggle(product.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          hitSlop={10}
        >
          <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? "#0274C1" : "#FFFFFF"} />
        </Pressable>
        {/* Add to Bag "+" — bottom-right, no bg */}
        <Pressable
          style={[styles.plusBtn, isAr ? styles.plusBtnAr : styles.plusBtnEn]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onQuickAdd(product); }}
          hitSlop={10}
        >
          <Feather name="plus" size={22} color="#FFFFFF" />
        </Pressable>
      </ProductImageCarousel>
      <View style={[styles.productInfo, isAr && { alignItems: "flex-end" }]}>
        <Text style={[styles.productTitle, { color: colors.foreground }]} numberOfLines={2}>
          {product.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: "#E53935" }]}>
            {formatIQD(product.price)}
          </Text>
          {hasDiscount && (
            <Text style={[styles.comparePrice, { color: colors.mutedForeground }]}>
              {formatIQD(product.comparePrice!)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function ProductSkeleton() {
  return (
    <View style={{ width: CARD_W }}>
      <View style={{ width: "100%", height: CARD_W * 1.2, borderRadius: 10, backgroundColor: "#F0F0F0" }} />
      <View style={{ paddingTop: 8, gap: 6 }}>
        <View style={{ height: 9, width: 50, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 12, width: 90, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 14, width: 55, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
      </View>
    </View>
  );
}

export default function CollectionScreen() {
  const { slug, bt, bv, bttl } = useLocalSearchParams<{ slug: string; bt?: string; bv?: string; bttl?: string }>();
  const router = useRouter();
  const colors = useColors();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { totalItems } = useCart();
  const { lang } = useLanguage();

  const topPad = isWeb ? 0 : insets.top;
  const botPad = isWeb ? 0 : insets.bottom;

  const [refreshing, setRefreshing] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const { addItem } = useCart();

  const scrollRef = useRef<any>(null);
  const searchRef = useRef<TextInput>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerBgAnim = useRef(new Animated.Value(0)).current;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Browse mode: a category/gender/sale listing routed in from the search page
  const isBrowse = bt === "category" || bt === "gender" || bt === "sale";
  // Detect whether this is a regular collection (ID) or a special collection (slug)
  const isRegularCollection = !isBrowse && !!slug && slug.startsWith("col_");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["collection", slug, isRegularCollection, bt, bv, bttl],
    queryFn: () => isBrowse
      ? fetchBrowseProducts({ type: bt as "category" | "gender" | "sale", value: bv, title: bttl })
      : isRegularCollection
        ? fetchCollection(slug ?? "")
        : fetchSpecialCollection(slug ?? ""),
    enabled: isBrowse ? true : !!slug,
    staleTime: 60_000,
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["collection-search", debouncedQ],
    queryFn: () => searchProducts(debouncedQ),
    enabled: debouncedQ.trim().length > 0,
  });

  const { data: siblings } = useQuery({
    queryKey: ["story-siblings", slug],
    queryFn: () => fetchStorySiblings(slug ?? ""),
    enabled: isRegularCollection,
    staleTime: 120_000,
  });

  const collection = data;
  const allProducts: Product[] = (collection?.products ?? []) as Product[];
  const rawProducts = debouncedQ.trim().length > 0
    ? (searchResults ?? [])
    : allProducts;
  // Keep in-stock products first; sold-out ones sink to the end (still tappable
  // so users can subscribe to a restock notification).
  const displayProducts = useMemo(() => {
    return [...rawProducts].sort((a, b) => {
      const aIn = isProductInStock(a) ? 0 : 1;
      const bIn = isProductInStock(b) ? 0 : 1;
      return aIn - bIn;
    });
  }, [rawProducts]);

  useEffect(() => {
    Animated.timing(headerBgAnim, {
      toValue: scrolled ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [scrolled]);

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQ(text), 380);
  };

  const handleClearSearch = () => {
    setQuery("");
    setDebouncedQ("");
    searchRef.current?.focus();
  };

  const handleSearchIconTap = () => {
    (scrollRef.current as any)?.scrollTo?.({ y: HERO_H, animated: true });
    setTimeout(() => searchRef.current?.focus(), 350);
  };

  const handleSearchBarTap = () => {
    searchRef.current?.focus();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const headerBg = headerBgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0,0,0,0)", colors.background],
  });

  // Smooth search-bar expansion driven directly by scroll position
  const SEARCH_START = SCROLL_THRESHOLD - 60;
  const SEARCH_END   = SCROLL_THRESHOLD + 100;

  const searchBarWidth = scrollY.interpolate({
    inputRange: [SEARCH_START, SEARCH_END],
    outputRange: [0, width - 120],
    extrapolate: "clamp",
  });

  const searchIconOpacity = scrollY.interpolate({
    inputRange: [SEARCH_START, SEARCH_START + 60],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const iconColor = scrolled ? colors.foreground : "#ffffff";

  const HEADER_H = topPad + 56;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ───── Fixed header overlay ───── */}
      <Animated.View
        style={[styles.fixedHeader, { height: HEADER_H, paddingTop: topPad, backgroundColor: headerBg }]}
        pointerEvents="box-none"
      >
        {/* Back button — no background */}
        <GlassBackButton
          noBackground
          onPress={() => { Keyboard.dismiss(); router.back(); }}
          color={iconColor}
        />

        {/* Flex spacer */}
        <View style={{ flex: 1 }} />

        {/* Right side: search icon → search bar + cart */}
        <View style={styles.headerRight}>
          {/* Animated search bar — width driven by scrollY for smooth expansion */}
          <Animated.View style={[styles.searchBarWrap, { width: searchBarWidth, overflow: "hidden" }]}>
            <Pressable
              style={[
                styles.searchBarInner,
                { backgroundColor: colors.secondary, borderColor: colors.border },
              ]}
              onPress={handleSearchBarTap}
              testID="search-bar-tap"
            >
              <Feather name="search" size={14} color={colors.mutedForeground} />
              <TextInput
                ref={searchRef}
                style={[styles.searchBarInput, { color: colors.foreground }]}
                placeholder="Search..."
                placeholderTextColor={colors.mutedForeground}
                value={query}
                onChangeText={handleChangeText}
                returnKeyType="search"
                autoCorrect={false}
                testID="search-input"
              />
              {query.length > 0 && (
                <Pressable onPress={handleClearSearch} hitSlop={8}>
                  <Feather name="x" size={14} color={colors.mutedForeground} />
                </Pressable>
              )}
            </Pressable>
          </Animated.View>

          {/* Search icon — fades out as search bar grows in */}
          <Animated.View style={{ opacity: searchIconOpacity }}>
            <Pressable
              style={styles.iconBtnPlain}
              onPress={handleSearchIconTap}
              hitSlop={10}
              testID="search-btn"
            >
              <Feather name="search" size={22} color={iconColor} />
            </Pressable>
          </Animated.View>

          {/* Cart button — no background */}
          <View style={styles.iconBtnWrap}>
            <Pressable
              style={styles.iconBtnPlain}
              onPress={() => router.push("/cart")}
              hitSlop={10}
              testID="cart-btn"
            >
              <Feather name="shopping-bag" size={22} color={iconColor} />
            </Pressable>
            {totalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalItems > 9 ? "9+" : totalItems}</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      {/* ───── Main scrollable content ───── */}
      <Animated.ScrollView
        ref={scrollRef as any}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: (e: any) => {
              const y = e.nativeEvent.contentOffset.y;
              setScrolled(y > SCROLL_THRESHOLD);
            },
          }
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
        }
        contentContainerStyle={{ paddingBottom: (isWeb ? 84 : botPad) + 64 }}
      >
        {/* Hero image — scrolls naturally */}
        <View style={styles.hero}>
          <Image
            source={{ uri: collection?.heroImage ? collection.heroImage : `https://picsum.photos/seed/${isBrowse ? `${bt}-${bv}` : slug}/800/500` }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <View style={styles.heroOverlay} />
          <View style={[styles.heroContent, { paddingTop: HEADER_H + 8 }, lang === "ar" && { alignItems: "flex-end" }]}>
            <Text style={[styles.heroTitle, lang === "ar" && { textAlign: "right" }]}>{collection?.title ?? " "}</Text>
            {!!collection?.description && (
              <Text style={[styles.heroDescription, lang === "ar" && { textAlign: "right" }]}>{collection.description}</Text>
            )}
          </View>
        </View>

        {/* Sibling story sections — quick nav to other collections in the same row */}
        {isRegularCollection && !!siblings?.length && (
          <SiblingStories siblings={siblings} />
        )}

        {/* Search suggestions / results header */}
        {debouncedQ.trim().length > 0 && (
          <View style={[styles.resultsHeader, { borderBottomColor: colors.border }]}>
            <Feather name="search" size={13} color={colors.mutedForeground} />
            <Text style={[styles.resultsCount, { color: colors.mutedForeground }]}>
              {searchLoading
                ? "Searching..."
                : `${displayProducts.length} result${displayProducts.length !== 1 ? "s" : ""} for "${debouncedQ}"`}
            </Text>
            <Pressable onPress={handleClearSearch} style={styles.clearBtn}>
              <Feather name="x" size={13} color={colors.mutedForeground} />
              <Text style={[styles.clearBtnTxt, { color: colors.mutedForeground }]}>Clear</Text>
            </Pressable>
          </View>
        )}

        {/* Trending chips — show when search bar focused but empty */}
        {scrolled && query.length === 0 && debouncedQ.length === 0 && (
          <View style={styles.trendingRow}>
            <Text style={[styles.trendingLabel, { color: colors.mutedForeground }]}>TRENDING</Text>
            <View style={styles.chipRow}>
              {["Blazer", "Dress", "Linen", "Jeans", "Shoes", "Sale"].map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  onPress={() => handleChangeText(t)}
                >
                  <Text style={[styles.chipText, { color: colors.foreground }]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Products / search results grid */}
        {isLoading && !refreshing ? (
          <View style={styles.productGrid}>
            {Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)}
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
            <Text style={[styles.errorText, { color: colors.foreground }]}>Failed to load</Text>
            <Pressable style={[styles.retryBtn, { backgroundColor: PRIMARY }]} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : searchLoading && debouncedQ.length > 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={PRIMARY} />
          </View>
        ) : displayProducts.length === 0 ? (
          <View style={styles.center}>
            <Feather name="package" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {debouncedQ.trim() ? `No results for "${debouncedQ}"` : "No products yet"}
            </Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {displayProducts.map((p) => (
              <ProductCard key={p.id} product={p} onQuickAdd={setQuickAddProduct} />
            ))}
          </View>
        )}
      </Animated.ScrollView>

      <QuickAddSheet
        visible={!!quickAddProduct}
        product={quickAddProduct}
        onClose={() => setQuickAddProduct(null)}
        onConfirm={(variant: Variant, qty: number) => {
          if (!quickAddProduct) return;
          addItem({
            productId: quickAddProduct.id,
            variantId: variant.id,
            title: quickAddProduct.title,
            vendor: quickAddProduct.vendor ?? "",
            price: variant.price ?? quickAddProduct.price,
            quantity: qty,
            size: variant.option1 ?? undefined,
            color: variant.option2 ?? undefined,
            image: quickAddProduct.images?.[0],
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* ── Fixed header ── */
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  headerTitle: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtnWrap: {
    position: "relative",
  },
  iconBtnPlain: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  cartBadgeText: { color: "#fff", fontSize: 8, fontFamily: "Inter_700Bold" },

  /* ── Search bar ── */
  searchBarWrap: {
    height: 36,
    justifyContent: "center",
  },
  searchBarInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    height: 36,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },

  /* ── Hero ── */
  hero: {
    height: HERO_H,
    position: "relative",
    overflow: "hidden",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 20,
    paddingBottom: 18,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#fff",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  heroDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 18,
  },

  /* ── Results / trending ── */
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  resultsCount: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13 },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  clearBtnTxt: { fontFamily: "Inter_500Medium", fontSize: 12 },
  trendingRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
  },
  trendingLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 4,
    borderWidth: 1,
  },

  /* ── Sibling stories (other collections in same row) ── */
  siblingScroll: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 8,
  },
  siblingWrap: {
    width: SIB_ITEM_W,
    alignItems: "center",
    gap: 6,
  },
  siblingCircle: {
    width: SIB_CIRCLE,
    height: SIB_CIRCLE,
    borderRadius: SIB_CIRCLE / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  siblingLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
    maxWidth: SIB_ITEM_W,
  },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 13 },

  /* ── Products 2-column grid ── */
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  productCard: {
    width: CARD_W,
  },
  productImageWrap: {
    width: "100%",
    height: CARD_W * 1.4,
    borderRadius: 0,
    overflow: "hidden",
    position: "relative",
  },
  discBadge: { position: "absolute", top: 10, zIndex: 2 },
  discBadgeEn: { left: 10 },
  discBadgeAr: { right: 10 },
  discText: { color: "#E53935", fontFamily: "Inter_700Bold", fontSize: 10 },
  heartBtn: { position: "absolute", top: 10, zIndex: 2 },
  heartBtnEn: { right: 10 },
  heartBtnAr: { left: 10 },
  plusBtn: { position: "absolute", bottom: 10, zIndex: 2 },
  plusBtnEn: { right: 10 },
  plusBtnAr: { left: 10 },
  productInfo: { paddingTop: 8, gap: 3 },
  productTitle: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  price: { fontFamily: "Inter_700Bold", fontSize: 14 },
  comparePrice: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textDecorationLine: "line-through",
  },

  /* ── States ── */
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
    paddingHorizontal: 24,
  },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 15 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center" },
});
