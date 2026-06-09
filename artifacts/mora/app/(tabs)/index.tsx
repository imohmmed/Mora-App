import React, { useRef, useState } from "react";
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { HomeHeader } from "@/components/HomeHeader";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SpecialCollectionsGrid } from "@/components/SpecialCollectionsGrid";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { fetchProducts, fetchSpecialCollections, fetchBanners } from "@/lib/api";
import type { Product, Banner, Variant } from "@/lib/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const CATEGORIES = ["ALL", "WOMEN", "MEN", "BEAUTY", "SALE"];
const CATEGORY_FILTERS: Record<string, string | undefined> = {
  ALL: undefined,
  WOMEN: "women",
  MEN: "men",
  BEAUTY: "beauty",
  SALE: "sale",
};

const CARD_COLORS = [
  "#E8EDF5", "#F0EBE3", "#E8F0E8", "#F5EDEB",
  "#EBF0F5", "#F5EBF5", "#FFF3E0", "#F0F0F0",
];

function cardColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CARD_COLORS[h % CARD_COLORS.length];
}

function getTag(product: Product): string | null {
  const tags = product.tags ?? [];
  if (product.category === "sale" || tags.some((t) => t.toLowerCase() === "sale")) return "SALE";
  if (tags.some((t) => t.toLowerCase() === "new") || product.category === "new_in") return "NEW";
  return null;
}

function ProductCard({
  item,
  onAddToBag,
}: {
  item: Product;
  onAddToBag: (product: Product) => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const { isWishlisted, toggle } = useWishlist();
  const liked = isWishlisted(item.id);
  const tag = getTag(item);
  const bg = cardColor(item.id);
  const imageUri = item.images?.[0];

  const handleLike = () => {
    toggle(item.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.productCard, { opacity: pressed ? 0.95 : 1 }]}
      testID={`product-${item.id}`}
      onPress={() => router.push(`/product/${item.id}`)}
    >
      <View style={[styles.productImage, { backgroundColor: bg }]}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Feather name="shopping-bag" size={40} color={colors.mutedForeground} />
        )}
        {tag && (
          <View
            style={[
              styles.productTag,
              {
                backgroundColor:
                  tag === "SALE" ? "#E53935" : tag === "NEW" ? "#0274C1" : "#1A1A1A",
              },
            ]}
          >
            <Text style={styles.productTagText}>{tag}</Text>
          </View>
        )}
        <Pressable style={styles.likeBtn} onPress={handleLike}>
          <Feather name="heart" size={18} color={liked ? "#E53935" : "#1A1A1A"} />
        </Pressable>
      </View>
      <View style={styles.productInfo}>
        <Text style={[styles.productBrand, { color: colors.mutedForeground }]}>
          {item.vendor ?? "Mora"}
        </Text>
        <Text style={[styles.productTitle, { color: colors.foreground }]} numberOfLines={2}>
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

function BannerSkeleton() {
  return <View style={[styles.banner, { backgroundColor: "#E0E0E0", width: SCREEN_WIDTH }]} />;
}

function BannerSlide({ banner }: { banner: Banner }) {
  const router = useRouter();
  const ctaAlign: Record<string, "flex-start" | "center" | "flex-end"> = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
  };
  const align = ctaAlign[banner.buttonAlign] ?? "flex-start";

  const handlePress = () => {
    if (!banner.hasButton && banner.linkUrl) {
      router.push(banner.linkUrl as any);
    }
  };

  return (
    <Pressable
      style={[styles.banner, { backgroundColor: banner.bgColor, width: SCREEN_WIDTH }]}
      onPress={handlePress}
      disabled={!!banner.hasButton}
    >
      {!!banner.imageUrl && (
        <Image
          source={{ uri: banner.imageUrl }}
          style={[StyleSheet.absoluteFill, { opacity: 0.4 }]}
          contentFit="cover"
        />
      )}
      <View style={styles.bannerContent}>
        <Text style={styles.bannerTitle}>{banner.title}</Text>
        {!!banner.subtitle && (
          <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
        )}
        {banner.hasButton && banner.buttonText ? (
          <Pressable
            style={({ pressed }) => [styles.bannerCta, { alignSelf: align, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => banner.linkUrl && router.push(banner.linkUrl as any)}
          >
            <Text style={styles.bannerCtaText}>{banner.buttonText}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeBanner, setActiveBanner] = useState(0);
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const { totalItems, addItem } = useCart();
  const { count: wishlistCount } = useWishlist();

  const handleAddToBag = (product: Product) => {
    setQuickAddProduct(product);
  };

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
  const bottomPadding = isWeb ? 0 : insets.bottom;
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
    queryFn: () => fetchProducts({ category: categoryFilter, limit: 20 }),
  });

  const { data: banners, isLoading: isBannersLoading } = useQuery({
    queryKey: ["banners"],
    queryFn: fetchBanners,
    staleTime: 300_000,
  });

  const {
    data: specialCollections,
    isLoading: isCollectionsLoading,
  } = useQuery({
    queryKey: ["special-collections"],
    queryFn: fetchSpecialCollections,
    staleTime: 120_000,
  });

  const products = data?.products ?? [];
  const displayBanners = banners ?? [];

  const handleBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (idx !== activeBanner) setActiveBanner(idx);
  };

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
          scrollEventThrottle={16}
          onScroll={handleBannerScroll}
          onMomentumScrollEnd={handleBannerScroll}
        >
          {isBannersLoading
            ? <BannerSkeleton />
            : displayBanners.length === 0
              ? (
                <View style={[styles.banner, { backgroundColor: "#0274C1", width: SCREEN_WIDTH }]}>
                  <View style={styles.bannerContent}>
                    <Text style={styles.bannerTitle}>{"New Season\nArrived"}</Text>
                    <Text style={styles.bannerSubtitle}>Explore the latest arrivals</Text>
                    <View style={styles.bannerCta}>
                      <Text style={styles.bannerCtaText}>SHOP NOW</Text>
                    </View>
                  </View>
                </View>
              )
              : displayBanners.map((banner) => (
                  <BannerSlide key={banner.id} banner={banner} />
                ))
          }
        </ScrollView>

        {displayBanners.length > 1 && (
          <View style={styles.dotsRow}>
            {displayBanners.map((_, i) => (
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
        )}

        <SpecialCollectionsGrid
          collections={specialCollections ?? []}
          loading={isCollectionsLoading}
        />

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
                <ProductCard key={product.id} item={product} onAddToBag={handleAddToBag} />
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

      <QuickAddSheet
        visible={quickAddProduct !== null}
        product={quickAddProduct}
        onClose={() => setQuickAddProduct(null)}
        onConfirm={handleQuickAddConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { height: 260, justifyContent: "flex-end", overflow: "hidden" },
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
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 1 },
  seeAll: { fontFamily: "Inter_500Medium", fontSize: 12, letterSpacing: 0.5 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 16 },
  productCard: { width: CARD_WIDTH },
  productImage: {
    width: "100%",
    height: CARD_WIDTH * 1.3,
    borderRadius: 2,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productTag: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1,
  },
  productTagText: { color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
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
  productBrand: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  productTitle: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, marginTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  productPrice: { fontFamily: "Inter_700Bold", fontSize: 14 },
  originalPrice: { fontFamily: "Inter_400Regular", fontSize: 12, textDecorationLine: "line-through" },
  errorBox: { alignItems: "center", paddingVertical: 40, gap: 12 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderRadius: 4 },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  addToCartBtn: {
    backgroundColor: "#0274C1",
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 2,
    marginTop: 6,
  },
  addToCartText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
