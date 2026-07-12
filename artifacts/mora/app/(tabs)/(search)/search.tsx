import React, { useEffect, useMemo, useRef, useState } from "react";
import { LiquidGlassBg, isIOS26Plus } from "@/components/LiquidGlassBg";
import { useNativeReady } from "@/hooks/useNativeReady";
import {
  Dimensions,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useQueries } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { searchProducts, fetchContentSections, fetchBrowseCollections, fetchProduct } from "@/lib/api";
import type { SearchCollection, TrendingKeyword } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { formatIQD } from "@/lib/format";
import { trackSearch, trackSearchClick } from "@/lib/tracking";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
import { ProductPreviewModal } from "@/components/ProductPreviewModal";
import { ShippingRulesNote } from "@/components/ShippingRulesNote";
import type { Product, Variant } from "@/lib/types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const IS_IOS = Platform.OS === "ios";
const PRIMARY = "#0274C1";

// Fallbacks used only if the editable content sections fail to load
const FALLBACK_TRENDING: TrendingKeyword[] = ["Blazer", "Linen", "Dress", "Sandals", "Jeans", "Silk"]
  .map((label, i) => ({ id: `tr_${i}`, label }));


const CARD_COLORS = [
  "#E8EDF5", "#F0EBE3", "#E8F0E8", "#F5EDEB",
  "#EBF0F5", "#F5EBF5", "#FFF3E0", "#F0F0F0",
];

function cardColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CARD_COLORS[h % CARD_COLORS.length];
}

const GlassViewComp: any = null;

let glassUIAvailable = false;
let ExpoUIHost: any, ExpoButton: any, ExpoHStack: any, ExpoImage: any, ExpoTextField: any;
let glassEffectM: any, paddingM: any, tintM: any, frameM: any;
try {
  const ui = require("@expo/ui/swift-ui");
  const mods = require("@expo/ui/swift-ui/modifiers");
  ExpoUIHost    = ui.Host;
  ExpoButton    = ui.Button;
  ExpoHStack    = ui.HStack;
  ExpoImage     = ui.Image;
  ExpoTextField = ui.TextField;
  glassEffectM  = mods.glassEffect;
  paddingM      = mods.padding;
  tintM         = mods.tint;
  frameM        = mods.frame;
  glassUIAvailable = !!(ExpoUIHost && ExpoHStack && ExpoTextField);
} catch {}

function ResultSkeleton() {
  return (
    <View style={{ width: CARD_WIDTH }}>
      <View style={[{ width: "100%", height: CARD_WIDTH * 1.3, borderRadius: 12, backgroundColor: "#F0F0F0" }]} />
      <View style={{ paddingTop: 8, gap: 6 }}>
        <View style={{ height: 10, width: 60, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 12, width: 100, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 14, width: 50, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
      </View>
    </View>
  );
}

// ─── WishlistSection ──────────────────────────────────────────────────────────

function WishlistSection({
  lang,
  onAddToBag,
}: {
  lang: string;
  onAddToBag: (product: Product) => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const { ids } = useWishlist();
  const { items: cartItems } = useCart();
  const isAr = lang === "ar";
  const scrollRef = useRef<ScrollView>(null);

  const wishlistIds = useMemo(() => [...ids].slice(0, 10), [ids]);

  const queries = useQueries({
    queries: wishlistIds.map((id) => ({
      queryKey: ["product", id],
      queryFn:  () => fetchProduct(id),
      staleTime: 300_000,
      retry: false,
    })),
  });

  const products = queries.map((q) => q.data).filter((p): p is Product => !!p);

  // In Arabic, row-reverse places item[0] at the far right — scroll there on load
  useEffect(() => {
    if (isAr && products.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
    }
  }, [isAr, products.length]);

  if (!ids.size) return null;

  const textCol    = colors.foreground;
  const cardBg     = colors.secondary;
  const hdrDivider = colors.border;
  const divider    = colors.border;

  return (
    <View style={{ marginTop: 6 }}>
      {/* In Arabic: row-reverse → "المفضلة" right, "عرض الكل" left */}
      <View style={[ws.hdrRow, { borderTopColor: hdrDivider, borderBottomColor: hdrDivider }, isAr && { flexDirection: "row-reverse" }]}>
        <Text style={[ws.hdr, { color: textCol }]}>
          {isAr ? "المفضلة" : "WISHLIST"}
        </Text>
        <Pressable
          onPress={() => router.push("/account" as any)}
          hitSlop={10}
        >
          <Text style={[ws.viewAll, { color: PRIMARY }]}>
            {isAr ? "عرض الكل" : "VIEW ALL"}
          </Text>
        </Pressable>
      </View>

      {products.length > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[ws.scroll, isAr && { flexDirection: "row-reverse" }]}
          decelerationRate="fast"
          snapToInterval={130}
        >
          {products.map((product) => {
            const inCart = cartItems.some((i) => i.productId === product.id);
            return (
              <Pressable
                key={product.id}
                style={[ws.card, { backgroundColor: cardBg }]}
                onPress={() => router.push(`/product/${product.id}` as any)}
              >
                <Image
                  source={{ uri: product.images?.[0] ?? "" }}
                  style={ws.cardImg}
                  contentFit="cover"
                />
                <View style={ws.cardBody}>
                  <Text style={[ws.cardPrice, { color: textCol }]}>{formatIQD(product.price)}</Text>
                  <Pressable
                    onPress={(e) => { e.stopPropagation?.(); if (!inCart) onAddToBag(product); }}
                    hitSlop={10}
                    style={ws.addIconBtn}
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
      )}

      <View style={{ height: 1, backgroundColor: divider, marginTop: 4 }} />
    </View>
  );
}

const ws = StyleSheet.create({
  hdrRow:    {
    borderTopWidth: 1, borderBottomWidth: 1,
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  hdr:       { fontSize: 12, fontFamily: "Cairo_700Bold", letterSpacing: 1, textTransform: "uppercase" },
  viewAll:   { fontSize: 12, fontFamily: "Cairo_500Medium" },
  scroll:    { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  card:      { width: 118, borderRadius: 0, overflow: "hidden" },
  cardImg:   { width: 118, height: 140 },
  cardBody:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 8 },
  cardPrice: { fontSize: 12, fontFamily: "Cairo_700Bold" },
  addIconBtn:{ padding: 4, alignItems: "center", justifyContent: "center" },
});

// ─── SearchResultCard ─────────────────────────────────────────────────────────
// Outer View (not Pressable) — image+text Pressable is separate from ADD TO BAG
// so ADD TO BAG can NEVER bubble up and trigger navigation.

function SearchResultCard({
  item,
  query,
  onAddToBag,
  onLongPress,
}: {
  item: Product;
  query: string;
  onAddToBag: (product: Product) => void;
  onLongPress: (product: Product) => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const { isWishlisted, toggle } = useWishlist();
  const { lang } = useLanguage();
  const liked = isWishlisted(item.id);
  const nativeReady = useNativeReady();
  const useGlass = IS_IOS && !!GlassViewComp && nativeReady;
  const useGlassBtn = IS_IOS && glassUIAvailable && nativeReady;
  const hasDiscount = item.comparePrice != null && item.comparePrice > item.price;

  return (
    <View style={styles.resultCard}>
      {/* ── Navigate / long-press area ── */}
      <Pressable
        style={({ pressed }) => [{ opacity: pressed ? 0.93 : 1 }]}
        onPress={() => {
          trackSearchClick(query, item.id);
          router.push(`/product/${item.id}`);
        }}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLongPress(item);
        }}
        delayLongPress={280}
      >
        <ProductImageCarousel
          images={item.images ?? []}
          style={[styles.resultImage, { backgroundColor: cardColor(item.id) }]}
          placeholder={<Feather name="shopping-bag" size={32} color={colors.mutedForeground} />}
        >
          {/* Wishlist button */}
          <Pressable
            style={styles.likeBtnWrap}
            onPress={() => {
              toggle(item.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            {useGlass ? (
              <GlassViewComp style={styles.likeBtnGlass} glassEffectStyle="clear">
                <Ionicons name={liked ? "heart" : "heart-outline"} size={15} color={liked ? "#0274C1" : "#1A1A1A"} />
              </GlassViewComp>
            ) : (
              <View style={[styles.likeBtnFallback, { backgroundColor: "rgba(255,255,255,0.92)" }]}>
                <Ionicons name={liked ? "heart" : "heart-outline"} size={15} color={liked ? "#0274C1" : "#1A1A1A"} />
              </View>
            )}
          </Pressable>
        </ProductImageCarousel>

        {/* Info text (no button) */}
        <View style={styles.resultInfo}>
          <Text style={[styles.resultBrand, { color: colors.mutedForeground }]}>
            {item.vendor ?? "Mora"}
          </Text>
          <Text style={[styles.resultTitle, { color: colors.foreground }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.resultPriceRow}>
            <Text style={[styles.resultPrice, { color: colors.foreground }]}>
              {formatIQD(item.price)}
            </Text>
            {hasDiscount && (
              <Text style={styles.resultOriginal}>
                {formatIQD(item.comparePrice!)}
              </Text>
            )}
          </View>
        </View>
      </Pressable>

      {/* ── ADD TO BAG — completely outside the navigate Pressable ── */}
      <Pressable
        style={styles.addToCartBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onAddToBag(item);
        }}
      >
        <Text style={styles.addToCartText}>{lang === "ar" ? "اضفه لسلتي" : "ADD TO BAG"}</Text>
      </Pressable>
    </View>
  );
}

// ─── SearchScreen ─────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lang } = useLanguage();
  const isWeb = Platform.OS === "web";

  // ── Editable trending keywords + browse collections (admin-managed) ──────────
  const { data: contentSections } = useQuery({
    queryKey: ["content-sections"],
    queryFn: fetchContentSections,
    staleTime: 5 * 60_000,
  });
  const trendingItems = (contentSections?.trending?.items as unknown as TrendingKeyword[]) ?? [];
  const trending = trendingItems.length ? trendingItems : FALLBACK_TRENDING;
  const { data: curatedBrowse } = useQuery({
    queryKey: ["browse-collections"],
    queryFn: fetchBrowseCollections,
    staleTime: 5 * 60_000,
  });
  const browseCollections: SearchCollection[] = (curatedBrowse ?? []).map((bc) => ({
    id: bc.slug,
    nameEn: bc.titleEn,
    nameAr: bc.titleAr,
    icon: "image",
    color: "#F0F0F0",
    linkType: "collection" as const,
    linkValue: bc.slug,
    image: bc.image,
  }));

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [glassKey, setGlassKey] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Tab re-press → focus keyboard ──────────────────────────────────────────
  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    const { TabEvents, TAB_SEARCH_FOCUS } = require("@/lib/tabEvents") as typeof import("@/lib/tabEvents");
    const offNative = TabEvents.on(TAB_SEARCH_FOCUS, focusInput);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.addEventListener("mora-focus-search", focusInput);
      return () => { offNative(); window.removeEventListener("mora-focus-search", focusInput); };
    }
    return offNative;
  }, []);
  const nativeReady2 = useNativeReady();
  const useGlass = IS_IOS && isIOS26Plus && nativeReady2;
  const useGlassBtn = IS_IOS && glassUIAvailable && nativeReady2;

  // ── Quick add state ──────────────────────────────────────────────────────────
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const [previewProduct,  setPreviewProduct]  = useState<Product | null>(null);
  const [previewVisible,  setPreviewVisible]  = useState(false);
  const { addItem } = useCart();

  const handleAddToBag = (product: Product) => setQuickAddProduct(product);

  const handleQuickAddConfirm = (variant: Variant, qty: number) => {
    if (!quickAddProduct) return;
    addItem({
      productId: quickAddProduct.id,
      variantId: variant.id,
      title: quickAddProduct.title,
      vendor: quickAddProduct.vendor ?? "Mora",
      price: variant.price,
      comparePrice: quickAddProduct.comparePrice,
      quantity: qty,
      size: variant.option1,
      color: variant.option2,
      image: quickAddProduct.images?.[0],
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleLongPress = (product: Product) => {
    setPreviewProduct(product);
    setPreviewVisible(true);
  };

  // ── Search query ─────────────────────────────────────────────────────────────
  const topPadding    = isWeb ? 0 : insets.top;
  const bottomPadding = isWeb ? 0 : insets.bottom;

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(text), 400);
  };

  const handleCollectionPress = (sc: SearchCollection) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const title = lang === "ar" ? (sc.nameAr || sc.nameEn) : sc.nameEn;
    if (sc.linkType === "collection" && sc.linkValue) {
      router.push(`/collection/${sc.linkValue}` as any);
    } else if (sc.linkType === "category" || sc.linkType === "gender" || sc.linkType === "sale") {
      router.push({
        pathname: "/collection/[slug]",
        params: { slug: "browse", bt: sc.linkType, bv: sc.linkValue, bttl: title },
      } as any);
    } else {
      handleChangeText(sc.linkValue || sc.nameEn);
    }
  };

  const { data: results, isLoading, isFetching, isError, refetch, isRefetching } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchProducts(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
  });

  // Log completed searches (once per debounced query when results resolve)
  const lastLoggedSearch = useRef("");
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q || isLoading || isFetching || results === undefined) return;
    if (lastLoggedSearch.current === q) return;
    lastLoggedSearch.current = q;
    trackSearch(q, results.length);
  }, [debouncedQuery, results, isLoading, isFetching]);

  const showResults = query.trim().length > 0;
  const isSearching = (isLoading || isFetching) && debouncedQuery.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Search header ── */}
      <View style={[
        styles.header,
        {
          paddingTop: topPadding + 8,
          borderBottomColor: (IS_IOS && glassUIAvailable && nativeReady2) || isIOS26Plus ? "transparent" : colors.border,
          backgroundColor: (IS_IOS && glassUIAvailable && nativeReady2) || isIOS26Plus ? "transparent" : colors.background,
        },
      ]}>
        {IS_IOS && glassUIAvailable && nativeReady2 ? (
          /* ── iOS SwiftUI Liquid Glass search bar ── */
          <ExpoUIHost key={glassKey} style={{ height: 48 }}>
            <ExpoHStack
              spacing={8}
              modifiers={[
                frameM({ height: 46, maxWidth: 10000 }),
                paddingM({ horizontal: 14 }),
                glassEffectM({ glass: { variant: "regular", interactive: true }, shape: "capsule" }),
              ]}
            >
              <ExpoImage systemName="magnifyingglass" size={18} color="#8E8E93" />
              <ExpoTextField
                placeholder={lang === "ar" ? "ابحث..." : "Search Mora..."}
                defaultValue=""
                onChangeText={handleChangeText}
                onSubmit={() => {}}
                modifiers={[frameM({ maxWidth: 10000 })]}
              />
              {query.length > 0 && (
                <ExpoImage
                  systemName="xmark.circle.fill"
                  size={18}
                  color="#8E8E93"
                  onPress={() => {
                    setQuery("");
                    setDebouncedQuery("");
                    setGlassKey((k) => k + 1);
                  }}
                />
              )}
            </ExpoHStack>
          </ExpoUIHost>
        ) : (
          /* ── Fallback: RN TextInput + LiquidGlassBg (iOS 26 non-native / Android / Web) ── */
          <View style={[
            styles.searchInputRow,
            {
              backgroundColor: isIOS26Plus ? "transparent" : colors.secondary,
              borderColor: isIOS26Plus ? "transparent" : (focused ? PRIMARY : colors.border),
              borderRadius: 14,
              overflow: "hidden",
            },
          ]}>
            <LiquidGlassBg />
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              ref={inputRef}
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder={lang === "ar" ? "ابحث..." : "Search Mora..."}
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={handleChangeText}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              returnKeyType="search"
              testID="search-input"
            />
            {query.length > 0 && (
              <Pressable onPress={() => { setQuery(""); setDebouncedQuery(""); }}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding + 80 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        refreshControl={
          showResults ? (
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />
          ) : undefined
        }
      >
        <ShippingRulesNote style={styles.shippingRules} />
        {!showResults ? (
          <>
            {/* ── Trending keywords ── */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }, lang === "ar" && { textAlign: "right" }]}>
                {lang === "ar" ? "الرائج" : "TRENDING"}
              </Text>
              <View style={[styles.tagsWrap, lang === "ar" && { flexDirection: "row-reverse" }]}>
                {useGlassBtn
                  ? trending.map((t) => (
                      <ExpoUIHost key={t.id} matchContents style={{ height: 38 }}>
                        <ExpoButton
                          label={t.label}
                          onPress={() => handleChangeText(t.label)}
                          modifiers={[
                            paddingM({ horizontal: 16, vertical: 8 }),
                            glassEffectM({ glass: { variant: "regular", interactive: true }, shape: "capsule" }),
                            tintM(colors.foreground),
                          ]}
                        />
                      </ExpoUIHost>
                    ))
                  : trending.map((t) => (
                      <Pressable
                        key={t.id}
                        style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                        onPress={() => handleChangeText(t.label)}
                      >
                        <Text style={[styles.tagText, { color: colors.foreground }]}>{t.label}</Text>
                      </Pressable>
                    ))
                }
              </View>
            </View>

            {/* ── Wishlist section ── */}
            <WishlistSection lang={lang} onAddToBag={handleAddToBag} />

            {/* ── Browse categories ── */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }, lang === "ar" && { textAlign: "right" }]}>
                {lang === "ar" ? "تصفح" : "BROWSE"}
              </Text>
              <View style={styles.categoriesGrid}>
                {browseCollections.map((cat) => {
                  const label = lang === "ar" ? (cat.nameAr || cat.nameEn) : cat.nameEn;
                  return (
                  <Pressable
                    key={cat.id}
                    style={({ pressed }) => [
                      styles.categoryCard,
                      { opacity: pressed ? 0.85 : 1, overflow: "hidden" },
                    ]}
                    onPress={() => handleCollectionPress(cat)}
                    testID={`category-${cat.id}`}
                  >
                    {cat.image ? (
                      /* ── Photo tile (image only, no text overlay) ── */
                      <Image
                        source={{ uri: cat.image }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                      />
                    ) : (
                      /* ── Icon fallback ── */
                      <>
                        {useGlass && <LiquidGlassBg />}
                        <View style={[styles.categoryInner, { backgroundColor: useGlass ? "transparent" : cat.color }]}>
                          <View style={[styles.categoryIconBg, { backgroundColor: useGlass ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.5)" }]}>
                            <Feather name={(cat.icon || "tag") as any} size={22} color="#1A1A1A" />
                          </View>
                          <Text style={[styles.categoryLabel, { color: "#1A1A1A" }]}>{label}</Text>
                        </View>
                      </>
                    )}
                  </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        ) : isSearching ? (
          <View style={styles.grid}>
            {Array.from({ length: 4 }).map((_, i) => <ResultSkeleton key={i} />)}
          </View>
        ) : isError ? (
          <View style={styles.errorBox}>
            <Feather name="wifi-off" size={40} color={colors.border} />
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
              Could not search. Check connection.
            </Text>
            <Pressable onPress={() => refetch()} style={[styles.retryBtn, { borderColor: colors.border }]}>
              <Text style={[styles.retryText, { color: colors.foreground }]}>Retry</Text>
            </Pressable>
          </View>
        ) : results && results.length > 0 ? (
          <>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsCount, { color: colors.mutedForeground }]}>
                {results.length} result{results.length !== 1 ? "s" : ""} for "{debouncedQuery}"
              </Text>
            </View>
            <View style={styles.grid}>
              {results.map((product) => (
                <SearchResultCard
                  key={product.id}
                  item={product}
                  query={debouncedQuery}
                  onAddToBag={handleAddToBag}
                  onLongPress={handleLongPress}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={styles.emptyResults}>
            <Feather name="search" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No results for "{query}"
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Try different keywords or browse categories
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Quick Add Sheet ── */}
      <QuickAddSheet
        visible={quickAddProduct !== null}
        product={quickAddProduct}
        onClose={() => setQuickAddProduct(null)}
        onConfirm={handleQuickAddConfirm}
      />

      {/* ── Long Press Preview Modal ── */}
      <ProductPreviewModal
        product={previewProduct}
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        onAddToBag={(p) => { setPreviewVisible(false); setQuickAddProduct(p); }}
        onViewProduct={(p) => { setPreviewVisible(false); router.push(`/product/${p.id}`); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  shippingRules: { paddingHorizontal: 16, paddingTop: 14 },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1.5,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Cairo_400Regular", padding: 0 },

  section: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  sectionTitle: { fontFamily: "Cairo_700Bold", fontSize: 13, letterSpacing: 1, marginBottom: 12 },

  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 1,
  },
  tagText: { fontFamily: "Cairo_500Medium", fontSize: 14 },

  categoriesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 1 },
  categoryCard: {
    width: (SCREEN_WIDTH - 33) / 2,
    height: (SCREEN_WIDTH - 40) / 2 * 1.15,
    overflow: "hidden",
    borderRadius: 0,
  },
  categoryInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  categoryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: { fontFamily: "Cairo_600SemiBold", fontSize: 14, letterSpacing: 0.3 },
  catImgOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  catImgLabel: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  errorBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  errorText: { fontFamily: "Cairo_400Regular", fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderRadius: 8 },
  retryText: { fontFamily: "Cairo_600SemiBold", fontSize: 13 },

  resultsHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  resultsCount: { fontFamily: "Cairo_400Regular", fontSize: 13 },

  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 16, paddingTop: 16 },

  /* Result card */
  resultCard: { width: CARD_WIDTH },
  resultImage: {
    width: "100%",
    height: CARD_WIDTH * 1.3,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  likeBtnWrap: { position: "absolute", top: 8, right: 8, zIndex: 1 },
  likeBtnGlass: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  likeBtnFallback: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
  },
  resultInfo: { paddingTop: 8, gap: 2 },
  resultBrand: { fontFamily: "Cairo_500Medium", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  resultTitle: { fontFamily: "Cairo_400Regular", fontSize: 13, lineHeight: 18 },
  resultPriceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  resultPrice: { fontFamily: "Cairo_700Bold", fontSize: 14 },
  resultOriginal: {
    fontFamily: "Cairo_400Regular",
    fontSize: 12,
    textDecorationLine: "line-through",
    color: "#E53935",
  },

  /* Add to cart btn */
  addToCartBtn: {
    backgroundColor: PRIMARY,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 100,
    marginTop: 8,
  },
  addToCartText: { color: "#FFFFFF", fontFamily: "Cairo_700Bold", fontSize: 11, letterSpacing: 0.8 },

  emptyResults: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80, gap: 12 },
  emptyTitle: { fontFamily: "Cairo_600SemiBold", fontSize: 18, textAlign: "center" },
  emptySubtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
