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
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { fetchSpecialCollection, fetchCollection, searchProducts, fetchBrowseProducts } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import { LiquidGlassBg, isIOS26Plus } from "@/components/LiquidGlassBg";
import { GlassBackButton } from "@/components/GlassBackButton";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
import type { Product, Variant } from "@/lib/types";

const { width } = Dimensions.get("window");
const HERO_H = 260;
const CARD_W = (width - 16 * 3) / 2;
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
  const hasDiscount = product.comparePrice && product.comparePrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0;
  const soldOut = !isProductInStock(product);

  return (
    <View style={[styles.productCard, { backgroundColor: colors.background }]}>
      <Pressable
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
        onPress={() => router.push(`/product/${product.id}`)}
        testID={`product-${product.id}`}
      >
        <ProductImageCarousel
          images={product.images ?? []}
          style={[styles.productImageWrap, { backgroundColor: colors.secondary }]}
        >
          {discountPct > 0 && (
            <View style={styles.discBadge}>
              <Text style={styles.discText}>-{discountPct}%</Text>
            </View>
          )}
        </ProductImageCarousel>
        <View style={styles.productInfo}>
          <Text style={[styles.vendor, { color: colors.mutedForeground }]} numberOfLines={1}>
            {product.vendor?.toUpperCase()}
          </Text>
          <Text style={[styles.productTitle, { color: colors.foreground }]} numberOfLines={2}>
            {product.title}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.foreground }]}>
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
      <Pressable
        style={[styles.addToCartBtn, soldOut && styles.notifyCartBtn]}
        onPress={() => onQuickAdd(product)}
      >
        {soldOut ? (
          <View style={styles.notifyCartInner}>
            <Feather name="bell" size={13} color="#FFFFFF" />
            <Text style={styles.addToCartText}>{lang === "ar" ? "أبلغني" : "NOTIFY ME"}</Text>
          </View>
        ) : (
          <Text style={styles.addToCartText}>{lang === "ar" ? "اضفه لسلتي" : "ADD TO BAG"}</Text>
        )}
      </Pressable>
    </View>
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
  const searchBarAnim = useRef(new Animated.Value(0)).current;
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
    Animated.spring(searchBarAnim, {
      toValue: scrolled ? 1 : 0,
      friction: 9,
      tension: 80,
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

  const searchBarWidth = searchBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width - 120],
  });

  const iconColor = scrolled ? colors.foreground : "#ffffff";
  const ICON_BG_SCROLLED = colors.secondary;
  const ICON_BG_TOP = "rgba(0,0,0,0.30)";

  const HEADER_H = topPad + 56;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ───── Fixed header overlay ───── */}
      <Animated.View
        style={[styles.fixedHeader, { height: HEADER_H, paddingTop: topPad, backgroundColor: headerBg }]}
        pointerEvents="box-none"
      >
        {/* Back button */}
        <GlassBackButton
          onPress={() => { Keyboard.dismiss(); router.back(); }}
          color={scrolled ? undefined : "#ffffff"}
        />

        {/* Flex spacer — title removed to avoid clashing with expanding search bar */}
        <View style={{ flex: 1 }} />

        {/* Right side: search icon → search bar + cart */}
        <View style={styles.headerRight}>
          {/* Animated search bar that expands when scrolled */}
          <Animated.View style={[styles.searchBarWrap, { width: searchBarWidth, overflow: "hidden" }]}>
            <Pressable
              style={[
                styles.searchBarInner,
                {
                  backgroundColor: isIOS26Plus ? "transparent" : colors.secondary,
                  borderColor: isIOS26Plus ? "transparent" : colors.border,
                  overflow: "hidden",
                },
              ]}
              onPress={handleSearchBarTap}
              testID="search-bar-tap"
            >
              {isIOS26Plus && <LiquidGlassBg />}
              {!isIOS26Plus && Platform.OS !== "web" && (
                <BlurView style={StyleSheet.absoluteFill} intensity={55} tint={isDark ? "systemThinMaterialDark" : "systemThinMaterial"} />
              )}
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

          {/* Search icon — visible only when NOT scrolled */}
          {!scrolled && (
            <Pressable
              style={[styles.iconBtn, { backgroundColor: isIOS26Plus ? "transparent" : ICON_BG_TOP }]}
              onPress={handleSearchIconTap}
              testID="search-btn"
            >
              {isIOS26Plus && <LiquidGlassBg />}
              {!isIOS26Plus && Platform.OS !== "web" && (
                <BlurView style={StyleSheet.absoluteFill} intensity={55} tint="systemThinMaterialDark" />
              )}
              <Feather name="search" size={20} color="#fff" />
            </Pressable>
          )}

          {/* Cart button */}
          <View style={styles.iconBtnWrap}>
            <Pressable
              style={[styles.iconBtn, { backgroundColor: isIOS26Plus ? "transparent" : (scrolled ? ICON_BG_SCROLLED : ICON_BG_TOP) }]}
              onPress={() => router.push("/cart")}
              testID="cart-btn"
            >
              {isIOS26Plus && <LiquidGlassBg />}
              {!isIOS26Plus && Platform.OS !== "web" && (
                <BlurView
                  style={StyleSheet.absoluteFill}
                  intensity={55}
                  tint={scrolled ? (isDark ? "systemThinMaterialDark" : "systemThinMaterial") : "systemThinMaterialDark"}
                />
              )}
              <Feather name="shopping-bag" size={20} color={iconColor} />
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
        onConfirm={(variant: Variant) => {
          if (!quickAddProduct) return;
          addItem({
            productId: quickAddProduct.id,
            variantId: variant.id,
            title: quickAddProduct.title,
            vendor: quickAddProduct.vendor ?? "",
            price: variant.price ?? quickAddProduct.price,
            quantity: 1,
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
    height: CARD_W * 1.2,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  discBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#E53935",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 10 },
  productInfo: { paddingTop: 8, gap: 2 },
  vendor: { fontFamily: "Inter_500Medium", fontSize: 9, letterSpacing: 0.8 },
  productTitle: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  price: { fontFamily: "Inter_700Bold", fontSize: 14 },
  comparePrice: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  addToCartBtn: {
    backgroundColor: "#0274C1",
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 100,
    marginTop: 8,
  },
  notifyCartBtn: {
    backgroundColor: "#3A3A3C",
  },
  notifyCartInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addToCartText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.8,
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
