import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { HomeHeader } from "@/components/HomeHeader";
import { CategoryTabs } from "@/components/CategoryTabs";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { fetchProducts } from "@/lib/api";
import type { Product } from "@/lib/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const CATEGORIES = ["ALL", "WOMEN", "MEN", "BEAUTY", "SALE"];
const CATEGORY_FILTERS: Record<string, string | undefined> = {
  ALL: undefined,
  WOMEN: "Women",
  MEN: "Men",
  BEAUTY: "Beauty",
  SALE: undefined,
};

const CARD_COLORS = [
  "#E8EDF5", "#F0EBE3", "#E8F0E8", "#F5EDEB",
  "#EBF0F5", "#F5EBF5", "#FFF3E0", "#F0F0F0",
];

const BANNERS = [
  { id: "1", title: "New Season\nArrived", subtitle: "Up to 40% off selected styles", cta: "SHOP NOW", bg: "#0274C1" },
  { id: "2", title: "Summer\nEdit", subtitle: "Fresh styles for warm days", cta: "EXPLORE", bg: "#1A1A1A" },
  { id: "3", title: "Members\nExclusive", subtitle: "Extra 15% off with code MORA15", cta: "JOIN NOW", bg: "#2E5FA3" },
];

function cardColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CARD_COLORS[h % CARD_COLORS.length];
}

function getTag(product: Product): string | null {
  const tags = product.tags ?? [];
  if (tags.some((t) => t.toLowerCase() === "sale")) return "SALE";
  if (tags.some((t) => t.toLowerCase() === "limited")) return "LIMITED";
  if (tags.some((t) => t.toLowerCase() === "new")) return "NEW";
  return null;
}

function ProductCard({ item }: { item: Product }) {
  const colors = useColors();
  const router = useRouter();
  const { isWishlisted, toggle } = useWishlist();
  const { addItem } = useCart();
  const liked = isWishlisted(item.id);
  const tag = getTag(item);
  const bg = cardColor(item.id);

  const handleLike = () => {
    toggle(item.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddToCart = () => {
    const variant = item.variants?.[0];
    addItem({
      productId: item.id,
      variantId: variant?.id ?? item.id,
      title: item.title,
      vendor: item.vendor ?? "Mora",
      price: variant?.price ?? item.price,
      quantity: 1,
      size: variant?.option1,
      color: variant?.option2,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.productCard, { opacity: pressed ? 0.95 : 1 }]}
      testID={`product-${item.id}`}
      onPress={() => router.push(`/product/${item.id}`)}
      onLongPress={handleAddToCart}
    >
      <View style={[styles.productImage, { backgroundColor: bg }]}>
        {tag && (
          <View
            style={[
              styles.productTag,
              {
                backgroundColor:
                  tag === "SALE" ? "#E53935" : tag === "LIMITED" ? "#1A1A1A" : colors.primary,
              },
            ]}
          >
            <Text style={styles.productTagText}>{tag}</Text>
          </View>
        )}
        <Pressable style={styles.likeBtn} onPress={handleLike}>
          <Feather
            name="heart"
            size={18}
            color={liked ? "#E53935" : "#1A1A1A"}
          />
        </Pressable>
        <View style={styles.productImagePlaceholder}>
          <Feather name="shopping-bag" size={40} color={colors.mutedForeground} />
        </View>
      </View>
      <View style={styles.productInfo}>
        <Text style={[styles.productBrand, { color: colors.mutedForeground }]}>
          {item.vendor ?? "Mora"}
        </Text>
        <Text
          style={[styles.productTitle, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.productPrice, { color: colors.foreground }]}>
            ${item.price.toFixed(2)}
          </Text>
          {item.comparePrice != null && item.comparePrice > item.price && (
            <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
              ${item.comparePrice.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function ProductSkeleton() {
  return (
    <View style={[styles.productCard]}>
      <View style={[styles.productImage, { backgroundColor: "#F0F0F0" }]} />
      <View style={{ paddingTop: 10, gap: 6 }}>
        <View style={{ height: 10, width: 60, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 12, width: 100, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 14, width: 50, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeBanner, setActiveBanner] = useState(0);
  const { totalItems } = useCart();
  const { count: wishlistCount } = useWishlist();

  const bottomPadding = isWeb ? 34 : insets.bottom;

  const categoryKey = CATEGORIES[activeCategory];
  const categoryFilter = CATEGORY_FILTERS[categoryKey ?? "ALL"];

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["products", categoryKey],
    queryFn: () =>
      fetchProducts({
        category: categoryFilter,
        limit: 20,
      }),
  });

  const products = data?.products ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HomeHeader notificationCount={0} favoritesCount={wishlistCount} cartCount={totalItems} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding + 80 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        <CategoryTabs
          categories={CATEGORIES}
          activeIndex={activeCategory}
          onChange={setActiveCategory}
        />

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveBanner(idx);
          }}
        >
          {BANNERS.map((banner) => (
            <View
              key={banner.id}
              style={[styles.banner, { backgroundColor: banner.bg, width: SCREEN_WIDTH }]}
            >
              <View style={styles.bannerContent}>
                <Text style={styles.bannerTitle}>{banner.title}</Text>
                <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                <Pressable
                  style={({ pressed }) => [styles.bannerCta, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={styles.bannerCtaText}>{banner.cta}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dotsRow}>
          {BANNERS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: activeBanner === i ? colors.primary : colors.border,
                  width: activeBanner === i ? 20 : 6,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {categoryKey === "ALL" ? "TRENDING NOW" : categoryKey}
          </Text>
          {!isLoading && (
            <Text style={[styles.seeAll, { color: colors.mutedForeground }]}>
              {products.length} items
            </Text>
          )}
        </View>

        {isError && (
          <View style={styles.errorBox}>
            <Feather name="wifi-off" size={32} color={colors.mutedForeground} />
            <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
              Could not load products
            </Text>
            <Pressable onPress={() => refetch()} style={[styles.retryBtn, { borderColor: colors.border }]}>
              <Text style={[styles.retryText, { color: colors.foreground }]}>Retry</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.grid}>
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)
            : products.map((product) => (
                <ProductCard key={product.id} item={product} />
              ))}
        </View>

        {!isLoading && products.length === 0 && !isError && (
          <View style={styles.emptyBox}>
            <Feather name="inbox" size={40} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No products found
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { height: 260, justifyContent: "flex-end" },
  bannerContent: { padding: 24, paddingBottom: 28 },
  bannerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: "#FFFFFF",
    lineHeight: 38,
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 20,
  },
  bannerCta: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  bannerCtaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: "#000000",
    letterSpacing: 1,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  dot: { height: 6, borderRadius: 3 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 1,
  },
  seeAll: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 16,
  },
  productCard: { width: CARD_WIDTH },
  productImage: {
    width: "100%",
    height: CARD_WIDTH * 1.3,
    borderRadius: 2,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  productImagePlaceholder: { alignItems: "center", justifyContent: "center" },
  productTag: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1,
  },
  productTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  likeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 6,
    zIndex: 1,
  },
  productInfo: { paddingTop: 10, gap: 2 },
  productBrand: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  productTitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  productPrice: { fontFamily: "Inter_700Bold", fontSize: 14 },
  originalPrice: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  errorBox: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 4,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
});
