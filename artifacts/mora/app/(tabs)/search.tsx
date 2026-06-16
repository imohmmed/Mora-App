import React, { useEffect, useRef, useState } from "react";
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
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { searchProducts } from "@/lib/api";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { formatIQD } from "@/lib/format";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import { ProductPreviewModal } from "@/components/ProductPreviewModal";
import type { Product, Variant } from "@/lib/types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const IS_IOS = Platform.OS === "ios";
const PRIMARY = "#0274C1";

const TRENDING = ["Blazer", "Linen", "Dress", "Sandals", "Jeans", "Silk"];

const CATEGORIES = [
  { label: "Women", icon: "user" as const, color: "#F5EBF5" },
  { label: "Men", icon: "user" as const, color: "#EBF0F5" },
  { label: "Beauty", icon: "droplet" as const, color: "#F5F0EB" },
  { label: "Shoes", icon: "box" as const, color: "#EBF5F0" },
  { label: "Bags", icon: "shopping-bag" as const, color: "#F5EBEB" },
  { label: "Sale", icon: "tag" as const, color: "#FFF3E0" },
];

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
let ExpoUIHost: any, ExpoButton: any;
let glassEffectM: any, paddingM: any, tintM: any, frameM: any;
try {
  const ui = require("@expo/ui/swift-ui");
  const mods = require("@expo/ui/swift-ui/modifiers");
  ExpoUIHost = ui.Host;
  ExpoButton = ui.Button;
  glassEffectM = mods.glassEffect;
  paddingM = mods.padding;
  tintM = mods.tint;
  frameM = mods.frame;
  glassUIAvailable = true;
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

// ─── SearchResultCard ─────────────────────────────────────────────────────────
// Outer View (not Pressable) — image+text Pressable is separate from ADD TO BAG
// so ADD TO BAG can NEVER bubble up and trigger navigation.

function SearchResultCard({
  item,
  onAddToBag,
  onLongPress,
}: {
  item: Product;
  onAddToBag: (product: Product) => void;
  onLongPress: (product: Product) => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const { isWishlisted, toggle } = useWishlist();
  const liked = isWishlisted(item.id);
  const imageUri = item.images?.[0];
  const nativeReady = useNativeReady();
  const useGlass = IS_IOS && !!GlassViewComp && nativeReady;
  const useGlassBtn = IS_IOS && glassUIAvailable && nativeReady;
  const hasDiscount = item.comparePrice != null && item.comparePrice > item.price;

  return (
    <View style={styles.resultCard}>
      {/* ── Navigate / long-press area ── */}
      <Pressable
        style={({ pressed }) => [{ opacity: pressed ? 0.93 : 1 }]}
        onPress={() => router.push(`/product/${item.id}`)}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLongPress(item);
        }}
        delayLongPress={280}
      >
        <View style={[styles.resultImage, { backgroundColor: cardColor(item.id) }]}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Feather name="shopping-bag" size={32} color={colors.mutedForeground} />
          )}

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
                <Feather name="heart" size={15} color={liked ? "#E53935" : "#1A1A1A"} />
              </GlassViewComp>
            ) : (
              <View style={[styles.likeBtnFallback, { backgroundColor: "rgba(255,255,255,0.92)" }]}>
                <Feather name="heart" size={15} color={liked ? "#E53935" : "#1A1A1A"} />
              </View>
            )}
          </Pressable>
        </View>

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
        <Text style={styles.addToCartText}>ADD TO BAG</Text>
      </Pressable>
    </View>
  );
}

// ─── SearchScreen ─────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [focused, setFocused] = useState(false);
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
  const useGlass = IS_IOS && !!GlassViewComp && nativeReady2;
  const useGlassBtn = IS_IOS && glassUIAvailable && nativeReady2;

  // ── Quick add state ──────────────────────────────────────────────────────────
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const [previewProduct,  setPreviewProduct]  = useState<Product | null>(null);
  const [previewVisible,  setPreviewVisible]  = useState(false);
  const { addItem } = useCart();

  const handleAddToBag = (product: Product) => setQuickAddProduct(product);

  const handleQuickAddConfirm = (variant: Variant) => {
    if (!quickAddProduct) return;
    addItem({
      productId: quickAddProduct.id,
      variantId: variant.id,
      title: quickAddProduct.title,
      vendor: quickAddProduct.vendor ?? "Mora",
      price: variant.price,
      quantity: 1,
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

  const { data: results, isLoading, isFetching, isError, refetch, isRefetching } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchProducts(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
  });

  const showResults = query.trim().length > 0;
  const isSearching = (isLoading || isFetching) && debouncedQuery.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Search header ── */}
      <View style={[styles.header, { paddingTop: topPadding + 8, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
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
            placeholder="Search Mora..."
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
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding + 80 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          showResults ? (
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />
          ) : undefined
        }
      >
        {!showResults ? (
          <>
            {/* ── Trending keywords ── */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>TRENDING</Text>
              <View style={styles.tagsWrap}>
                {useGlassBtn
                  ? TRENDING.map((t) => (
                      <ExpoUIHost key={t} matchContents style={{ height: 38 }}>
                        <ExpoButton
                          label={t}
                          onPress={() => handleChangeText(t)}
                          modifiers={[
                            paddingM({ horizontal: 16, vertical: 8 }),
                            glassEffectM({ glass: { variant: "regular", interactive: true }, shape: "roundedRectangle" }),
                            tintM(colors.foreground),
                          ]}
                        />
                      </ExpoUIHost>
                    ))
                  : TRENDING.map((t) => (
                      <Pressable
                        key={t}
                        style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                        onPress={() => handleChangeText(t)}
                      >
                        <Text style={[styles.tagText, { color: colors.foreground }]}>{t}</Text>
                      </Pressable>
                    ))
                }
              </View>
            </View>

            {/* ── Browse categories ── */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>BROWSE</Text>
              <View style={styles.categoriesGrid}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.label}
                    style={({ pressed }) => [
                      styles.categoryCard,
                      {
                        backgroundColor: useGlass ? "transparent" : cat.color,
                        borderRadius: 16,
                        overflow: "hidden",
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    onPress={() => handleChangeText(cat.label)}
                    testID={`category-${cat.label}`}
                  >
                    {useGlass && (
                      <GlassViewComp style={StyleSheet.absoluteFill} glassEffectStyle="clear" />
                    )}
                    <View style={[styles.categoryInner, { backgroundColor: useGlass ? "transparent" : cat.color }]}>
                      <View style={[styles.categoryIconBg, { backgroundColor: useGlass ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.5)" }]}>
                        <Feather name={cat.icon} size={22} color="#1A1A1A" />
                      </View>
                      <Text style={[styles.categoryLabel, { color: "#1A1A1A" }]}>{cat.label}</Text>
                    </View>
                  </Pressable>
                ))}
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
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1.5,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },

  section: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 1, marginBottom: 12 },

  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: { fontFamily: "Inter_500Medium", fontSize: 14 },

  categoriesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  categoryCard: {
    width: (SCREEN_WIDTH - 56) / 2,
    height: 100,
    overflow: "hidden",
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
  categoryLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, letterSpacing: 0.3 },

  errorBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderRadius: 8 },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  resultsHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  resultsCount: { fontFamily: "Inter_400Regular", fontSize: 13 },

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
  resultBrand: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  resultTitle: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  resultPriceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  resultPrice: { fontFamily: "Inter_700Bold", fontSize: 14 },
  resultOriginal: {
    fontFamily: "Inter_400Regular",
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
  addToCartText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.8 },

  emptyResults: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80, gap: 12 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, textAlign: "center" },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
