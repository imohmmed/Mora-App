import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ProductPreviewModal } from "@/components/ProductPreviewModal";
import {
  Animated,
  ActivityIndicator,
  Dimensions,
  FlatList,
  LayoutAnimation,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";

import { Image } from "expo-image";
import Video from "react-native-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useNativeReady } from "@/hooks/useNativeReady";
import { useLanguage } from "@/context/LanguageContext";
import { HomeHeader } from "@/components/HomeHeader";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SpecialCollectionsGrid } from "@/components/SpecialCollectionsGrid";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { fetchProducts, fetchSpecialCollections, fetchBanners, fetchStories, fetchContentSections } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import { StoriesSection } from "@/components/StoriesSection";
import type { Product, Banner, Variant } from "@/lib/types";

// Enable LayoutAnimation on Android (always-on on iOS)
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const IS_IOS = Platform.OS === "ios";

type TabFilter = { category?: string; gender?: string; tag?: string };
type TabConfig = { id: string; label: string; arabicLabel?: string; filterType: string; filterValue?: string };

const DEFAULT_TABS: TabConfig[] = [
  { id: "tab_all",    label: "ALL",     arabicLabel: "الكل",    filterType: "all" },
  { id: "tab_women",  label: "WOMEN",   arabicLabel: "نساء",    filterType: "gender",   filterValue: "women" },
  { id: "tab_men",    label: "MEN",     arabicLabel: "رجال",    filterType: "gender",   filterValue: "men" },
  { id: "tab_beauty", label: "BEAUTY",  arabicLabel: "جمال",    filterType: "category", filterValue: "beauty" },
  { id: "tab_sale",   label: "SALE",    arabicLabel: "تخفيضات", filterType: "sale" },
  { id: "tab_foryou", label: "FOR YOU", arabicLabel: "لك ✦",    filterType: "foryou" },
];

function getTabFilter(tab: TabConfig): TabFilter {
  switch (tab.filterType) {
    case "gender":   return { gender: tab.filterValue };
    case "category": return { category: tab.filterValue };
    case "sale":     return { category: "sale" };
    default:         return {};
  }
}

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

// expo-glass-effect removed — caused EXC_BAD_ACCESS on iOS 26 beta during native view registration
const GlassViewComp: any = null;


// ─── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({
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
  const { lang } = useLanguage();
  const { isWishlisted, toggle } = useWishlist();
  const liked = isWishlisted(item.id);
  const bg = cardColor(item.id);
  const isAr = lang === "ar";

  const hasDiscount = item.comparePrice != null && item.comparePrice > item.price;
  const discountPct = hasDiscount
    ? Math.round((1 - item.price / item.comparePrice!) * 100)
    : 0;

  const handleLike = () => {
    toggle(item.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.productCard, { opacity: pressed ? 0.93 : 1 }]}
      onPress={() => router.push(`/product/${item.id}`)}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress(item);
      }}
      delayLongPress={280}
      testID={`product-${item.id}`}
    >
      {/* ── Image ── */}
      <ProductImageCarousel
        images={item.images ?? []}
        style={[styles.productImage, { backgroundColor: bg }]}
        placeholder={<Feather name="shopping-bag" size={40} color={colors.mutedForeground} />}
      >
        {/* Discount badge — top corner */}
        {hasDiscount && discountPct > 0 && (
          <View style={[styles.discountBadge, isAr ? styles.discountBadgeAr : styles.discountBadgeEn]}>
            <Text style={styles.discountBadgeText}>
              {isAr ? `▼ ${discountPct}% خصم` : `▼ ${discountPct}% OFF`}
            </Text>
          </View>
        )}

        {/* Wishlist — bottom corner */}
        <Pressable
          style={[styles.likeBtnWrap, isAr ? styles.likeBtnAr : styles.likeBtnEn]}
          onPress={handleLike}
          hitSlop={8}
        >
          <View style={[styles.likeBtn, { backgroundColor: "rgba(255,255,255,0.92)" }]}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={16}
              color={liked ? "#0274C1" : "#1A1A1A"}
            />
          </View>
        </Pressable>

        {/* Add to Bag strip — bottom of image */}
        <Pressable
          style={styles.addToBagStrip}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onAddToBag(item);
          }}
        >
          <Text style={styles.addToBagText}>
            {isAr ? "أضف للحقيبة" : "ADD TO BAG"}
          </Text>
        </Pressable>
      </ProductImageCarousel>

      {/* ── Text info ── */}
      <View style={[styles.productInfo, isAr && styles.productInfoAr]}>
        <Text
          style={[styles.productTitle, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <View style={[styles.priceRow, isAr && styles.priceRowAr]}>
          {hasDiscount ? (
            <>
              <Text style={styles.salePrice}>{formatIQD(item.price)}</Text>
              <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                {formatIQD(item.comparePrice!)}
              </Text>
            </>
          ) : (
            <Text style={[styles.productPrice, { color: colors.foreground }]}>
              {formatIQD(item.price)}
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

function BannerSkeleton() {
  return <View style={[styles.banner, { backgroundColor: "#E0E0E0", width: SCREEN_WIDTH }]} />;
}

function BannerSlide({ banner, bannerHeight }: { banner: Banner; bannerHeight: number }) {
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
      style={[styles.banner, { backgroundColor: banner.bgColor, width: SCREEN_WIDTH, height: bannerHeight }]}
      onPress={handlePress}
      disabled={!!banner.hasButton}
    >
      {!!banner.videoUrl ? (
        <Video
          source={{ uri: banner.videoUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          muted
          repeat
          paused={false}
          controls={false}
          ignoreSilentSwitch="ignore"
          playInBackground={false}
          disableFocus
        />
      ) : !!banner.imageUrl ? (
        <Image
          source={{ uri: banner.imageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.28)" }]} />
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
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  // Full-screen hero: header floats as transparent overlay, so banner = full screen height
  const bannerHeight = SCREEN_HEIGHT;
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeBanner, setActiveBanner] = useState(0);
  // Tracks the current banner index WITHOUT causing re-renders — used by the
  // auto-scroll timer so it always knows the real position even before the
  // scroll animation finishes (avoids the state-closure stale-index bug).
  const activeBannerRef = useRef(0);
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const [previewProduct, setPreviewProduct]   = useState<Product | null>(null);
  const [previewVisible, setPreviewVisible]   = useState(false);
  const { totalItems, addItem } = useCart();
  const { count: wishlistCount } = useWishlist();
  const router = useRouter();

  // Header hide-on-scroll
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerShown = useRef(true);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - lastScrollY.current;
    lastScrollY.current = y;

    // Always show near the top
    if (y < 60) {
      if (!headerShown.current) {
        headerShown.current = true;
        Animated.spring(headerTranslateY, { toValue: 0, useNativeDriver: true, tension: 120, friction: 20 }).start();
      }
      return;
    }

    if (dy > 4 && headerShown.current) {
      // Scrolling down — hide
      headerShown.current = false;
      Animated.spring(headerTranslateY, { toValue: -120, useNativeDriver: true, tension: 120, friction: 20 }).start();
    } else if (dy < -4 && !headerShown.current) {
      // Scrolling up — show
      headerShown.current = true;
      Animated.spring(headerTranslateY, { toValue: 0, useNativeDriver: true, tension: 120, friction: 20 }).start();
    }
  }, [headerTranslateY]);

  const handleAddToBag = (product: Product) => {
    setQuickAddProduct(product);
  };

  const handleLongPress = (product: Product) => {
    setPreviewProduct(product);
    setPreviewVisible(true);
  };

  const handleQuickAddConfirm = (variant: Variant, qty: number) => {
    if (!quickAddProduct) return;
    addItem({
      productId: quickAddProduct.id,
      variantId: variant.id,
      title: quickAddProduct.title,
      vendor: quickAddProduct.vendor ?? "Mora",
      price: variant.price,
      quantity: qty,
      size: variant.option1,
      color: variant.option2,
      image: quickAddProduct.images?.[0],
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const bottomPadding = isWeb ? 0 : insets.bottom;

  const flatListRef  = useRef<FlatList>(null);
  const bannerRef    = useRef<FlatList>(null);
  useEffect(() => {
    const scrollTop = () => flatListRef.current?.scrollToOffset?.({ offset: 0, animated: true });
    // Native: TabEvents bus
    const { TabEvents, TAB_HOME_SCROLL_TOP } = require("@/lib/tabEvents") as typeof import("@/lib/tabEvents");
    const offNative = TabEvents.on(TAB_HOME_SCROLL_TOP, scrollTop);
    // Web: window event (legacy + WebLiquidTabBar)
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.addEventListener("mora-scroll-home-top", scrollTop);
      return () => { offNative(); window.removeEventListener("mora-scroll-home-top", scrollTop); };
    }
    return offNative;
  }, []);

  // ── Banners query must come BEFORE the auto-scroll effect that uses displayBanners
  // (web enforces TDZ for const; native Hermes does not — so this only crashed on web)
  const { data: banners, isLoading: isBannersLoading } = useQuery({
    queryKey: ["banners"],
    queryFn: fetchBanners,
    staleTime: 300_000,
  });
  const displayBanners = banners ?? [];

  // ── Banner auto-scroll every 3 s ──────────────────────────────────────────
  // IMPORTANT: do NOT call setActiveBanner here.  Setting state before the
  // scroll animation starts means onScroll fires with the OLD offset → the
  // handler immediately sets state back to prev → dots glitch forward/back/
  // forward on every tick.  Instead, only advance the ref and let the FlatList
  // call scrollToIndex; onMomentumScrollEnd then syncs the React state once
  // the scroll has actually settled.
  useEffect(() => {
    if (!displayBanners || displayBanners.length <= 1) return;
    const id = setInterval(() => {
      const next = (activeBannerRef.current + 1) % displayBanners.length;
      activeBannerRef.current = next;
      try {
        bannerRef.current?.scrollToIndex({ index: next, animated: true });
      } catch {}
    }, 3000);
    return () => clearInterval(id);
  }, [displayBanners]);

  const { data: contentSections } = useQuery({
    queryKey: ["content-sections"],
    queryFn: fetchContentSections,
    staleTime: 300_000,
  });

  const menuTabs = useMemo<TabConfig[]>(() => {
    const section = contentSections?.["menu_tabs"];
    if (section?.items?.length) return section.items as unknown as TabConfig[];
    return DEFAULT_TABS;
  }, [contentSections]);

  const safeActiveCategory = Math.min(activeCategory, menuTabs.length - 1);
  const activeTab = menuTabs[safeActiveCategory] ?? menuTabs[0];
  const categoryKey = activeTab?.label ?? "ALL";
  const isForYou = activeTab?.filterType === "foryou";
  const [forYouFilter, setForYouFilter] = useState<TabFilter>({});

  useEffect(() => {
    if (!isForYou) return;
    AsyncStorage.getItem("mora_views").then((raw) => {
      const views = JSON.parse(raw || "[]") as { id: string; tags: string[]; gender: string }[];
      if (views.length === 0) { setForYouFilter({}); return; }
      const tagCount: Record<string, number> = {};
      const genderCount: Record<string, number> = {};
      views.slice(0, 15).forEach((v) => {
        v.tags?.forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; });
        if (v.gender && v.gender !== "all") genderCount[v.gender] = (genderCount[v.gender] || 0) + 1;
      });
      const topTag = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a])[0];
      const topGender = Object.keys(genderCount).sort((a, b) => genderCount[b] - genderCount[a])[0];
      setForYouFilter({ tag: topTag, gender: topGender });
    }).catch(() => {});
  }, [isForYou]);

  const activeFilter = isForYou ? forYouFilter : getTabFilter(activeTab ?? DEFAULT_TABS[0]);

  const PAGE_SIZE = 20;
  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["products", categoryKey, JSON.stringify(activeFilter)],
    queryFn: ({ pageParam = 1 }: { pageParam?: number }) =>
      fetchProducts({ ...activeFilter, limit: PAGE_SIZE, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.limit);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const { data: specialCollections, isLoading: isCollectionsLoading } = useQuery({
    queryKey: ["special-collections"],
    queryFn: fetchSpecialCollections,
    staleTime: 120_000,
  });

  const { data: storyRows } = useQuery({
    queryKey: ["stories"],
    queryFn: fetchStories,
    staleTime: 300_000,
  });

  const products = useMemo(
    () => data?.pages.flatMap((p) => p.products) ?? [],
    [data]
  );
  const totalCount = data?.pages[0]?.total ?? 0;

  // Called ONLY from onMomentumScrollEnd — fires once when the scroll animation
  // settles.  This is the single source of truth for activeBanner state.
  // We deliberately do NOT use onScroll (continuous) because that fires during
  // the auto-scroll animation with intermediate offsets, which caused the
  // dots to flicker back and forth on every auto-advance.
  const handleBannerMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    activeBannerRef.current = idx;
    // Animate the dot width change smoothly
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveBanner(idx);
  };

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── FlatList ListHeaderComponent (all content above product grid) ────────────
  const ListHeader = useMemo(() => (
    <View>
      {/* ── Banner Carousel — negative margin cancels FlatList paddingHorizontal ── */}
      <View style={{ marginHorizontal: -10 }}>
        {isBannersLoading ? (
          <View style={[styles.banner, { backgroundColor: "#E0E0E0", width: SCREEN_WIDTH, height: bannerHeight }]} />
        ) : displayBanners.length === 0 ? (
          <View style={[styles.banner, { backgroundColor: "#0274C1", width: SCREEN_WIDTH, height: bannerHeight }]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.18)" }]} />
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>{"New Season\nArrived"}</Text>
              <Text style={styles.bannerSubtitle}>Explore the latest arrivals</Text>
              <View style={styles.bannerCta}>
                <Text style={styles.bannerCtaText}>SHOP NOW</Text>
              </View>
            </View>
          </View>
        ) : (
          <FlatList
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleBannerMomentumEnd}
            data={displayBanners}
            keyExtractor={(b) => b.id}
            renderItem={({ item }) => <BannerSlide banner={item} bannerHeight={bannerHeight} />}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            style={{ height: bannerHeight }}
          />
        )}
      </View>

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

      {/* ── Category Tabs (below banner) ── */}
      <CategoryTabs
        categories={menuTabs.map((t) => lang === "ar" && (t as TabConfig).arabicLabel ? (t as TabConfig).arabicLabel! : t.label)}
        activeIndex={safeActiveCategory}
        onChange={setActiveCategory}
      />

      <SpecialCollectionsGrid
        collections={specialCollections ?? []}
        loading={isCollectionsLoading}
      />

      <StoriesSection rows={storyRows ?? []} activeFilter={activeFilter} />

      {/* ── Trending header ── */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {activeTab?.filterType === "all" ? "TRENDING NOW" : isForYou ? "FOR YOU ✦" : categoryKey}
        </Text>
        {!isLoading && totalCount > 0 && (
          <Text style={[styles.seeAll, { color: colors.mutedForeground }]}>
            {totalCount} items
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

      {/* Skeleton rows (2 per row) when loading */}
      {isLoading && (
        <View style={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)}
        </View>
      )}
    </View>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [
    activeCategory, safeActiveCategory, activeBanner, categoryKey, activeTab, isForYou, menuTabs, colors, displayBanners,
    isCollectionsLoading, isError, isBannersLoading, isLoading, isRefetching,
    specialCollections, storyRows, totalCount, activeFilter, bannerHeight,
  ]);

  const renderProduct = useCallback(({ item }: { item: Product }) => (
    <ProductCard item={item} onAddToBag={handleAddToBag} onLongPress={handleLongPress} />
  ), []);

  const ListFooter = isFetchingNextPage ? (
    <ActivityIndicator
      size="small"
      color={colors.primary}
      style={{ paddingVertical: 20 }}
    />
  ) : !isLoading && products.length === 0 && !isError ? (
    <View style={styles.emptyBox}>
      <Feather name="inbox" size={40} color={colors.border} />
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        No products found
      </Text>
    </View>
  ) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        ref={flatListRef}
        data={isLoading ? [] : products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: bottomPadding + 80 }}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      />

      {/* ── Floating transparent header overlay — hides on scroll down ── */}
      <Animated.View
        style={[styles.headerOverlay, { transform: [{ translateY: headerTranslateY }] }]}
        pointerEvents="box-none"
      >
        <HomeHeader transparent favoritesCount={wishlistCount} cartCount={totalItems} />
      </Animated.View>

      <QuickAddSheet
        visible={quickAddProduct !== null}
        product={quickAddProduct}
        onClose={() => setQuickAddProduct(null)}
        onConfirm={handleQuickAddConfirm}
      />

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

  /* ── Floating header overlay — fixed on web, absolute on native ── */
  headerOverlay: {
    position: Platform.OS === "web" ? ("fixed" as any) : "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },

  /* ── Banner ── */
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

  /* ── Dots ── */
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  dot: { height: 6, borderRadius: 3 },

  /* ── Section header ── */
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

  /* ── Grid (skeleton rows only) ── */
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },

  /* ── FlatList column wrapper ── */
  row: { gap: 16, marginBottom: 16 },

  /* ── Product card ── */
  productCard: { width: CARD_WIDTH, flex: 1 },
  productImage: {
    width: "100%",
    height: CARD_WIDTH * 1.4,
    borderRadius: 0,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  /* Discount badge — top corner */
  discountBadge: {
    position: "absolute",
    top: 10,
    paddingHorizontal: 0,
    paddingVertical: 0,
    zIndex: 2,
  },
  discountBadgeEn: { left: 10 },
  discountBadgeAr: { right: 10 },
  discountBadgeText: {
    color: "#E53935",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },

  /* Wishlist button — bottom corner */
  likeBtnWrap: {
    position: "absolute",
    bottom: 44,
    zIndex: 2,
  },
  likeBtnEn: { right: 10 },
  likeBtnAr: { left: 10 },
  likeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Add to Bag strip — bottom of image */
  addToBagStrip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(2,116,193,0.88)",
    paddingVertical: 10,
    alignItems: "center",
    zIndex: 2,
  },
  addToBagText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1,
  },

  /* Product info */
  productInfo: { paddingTop: 8, gap: 3 },
  productInfoAr: { alignItems: "flex-end" },
  productTitle: { fontFamily: "Inter_700Bold", fontSize: 13, lineHeight: 18 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  priceRowAr: { flexDirection: "row-reverse" },
  productPrice: { fontFamily: "Inter_700Bold", fontSize: 13 },
  salePrice: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#E53935" },
  originalPrice: { fontFamily: "Inter_400Regular", fontSize: 11, textDecorationLine: "line-through" },

  /* Error / empty */
  errorBox: { alignItems: "center", paddingVertical: 40, gap: 12 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderRadius: 8 },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14 },
});
