import React, { useCallback, useState } from "react";
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
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
import { fetchSpecialCollection } from "@/lib/api";
import type { Product } from "@/lib/types";

const { width } = Dimensions.get("window");
const HERO_H = 220;
const CARD_W = (width - 16 * 3) / 2;
const PRIMARY = "#0274C1";

function ProductCard({ product }: { product: Product }) {
  const colors = useColors();
  const router = useRouter();
  const hasDiscount = product.comparePrice && product.comparePrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.productCard,
        { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
      ]}
      onPress={() => router.push(`/product/${product.id}`)}
      testID={`product-${product.id}`}
    >
      <View style={[styles.productImageWrap, { backgroundColor: colors.secondary }]}>
        <Image
          source={{ uri: product.images?.[0] }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        {discountPct > 0 && (
          <View style={styles.discBadge}>
            <Text style={styles.discText}>-{discountPct}%</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={[styles.vendor, { color: colors.mutedForeground }]} numberOfLines={1}>
          {product.vendor?.toUpperCase()}
        </Text>
        <Text style={[styles.productTitle, { color: colors.foreground }]} numberOfLines={2}>
          {product.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.foreground }]}>
            ${product.price.toFixed(2)}
          </Text>
          {hasDiscount && (
            <Text style={[styles.comparePrice, { color: colors.mutedForeground }]}>
              ${product.comparePrice!.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function CollectionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { totalItems } = useCart();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["special-collection", slug],
    queryFn: () => fetchSpecialCollection(slug ?? ""),
    enabled: !!slug,
    staleTime: 60_000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPad = isWeb ? 0 : insets.top;
  const collection = data;
  const products: Product[] = (collection?.products ?? []) as Product[];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.heroBox}>
        <Image
          source={{ uri: collection?.heroImage ?? `https://picsum.photos/seed/${slug}/800/500` }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <View style={styles.heroOverlay} />

        <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => router.back()}
            testID="back-btn"
          >
            <Feather name="arrow-left" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {collection?.title ?? " "}
          </Text>
          <View style={styles.topRight}>
            <Pressable style={styles.iconBtn} onPress={() => router.push("/(tabs)/search")} testID="search-btn">
              <Feather name="search" size={22} color="#fff" />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => router.push("/(tabs)/cart")} testID="cart-btn">
              <Feather name="shopping-bag" size={22} color="#fff" />
              {totalItems > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{totalItems > 9 ? "9+" : totalItems}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.heroFooter}>
          <Text style={styles.heroDescription}>{collection?.description ?? ""}</Text>
        </View>
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={PRIMARY} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>Failed to load</Text>
          <Pressable style={[styles.retryBtn, { backgroundColor: PRIMARY }]} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.grid, { paddingBottom: (isWeb ? 0 : insets.bottom) + 64 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        >
          {products.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="package" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No products yet</Text>
            </View>
          ) : (
            <View style={styles.productGrid}>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroBox: {
    height: HERO_H,
    position: "relative",
    overflow: "hidden",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#fff",
    letterSpacing: 0.3,
  },
  topRight: { flexDirection: "row", gap: 8 },
  cartBadge: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
  heroFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  heroDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  grid: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  productCard: {
    width: CARD_W,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  productImageWrap: {
    width: "100%",
    height: CARD_W * 1.2,
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
  discText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
  },
  productInfo: { padding: 10, gap: 2 },
  vendor: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    letterSpacing: 0.8,
  },
  productTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  price: { fontFamily: "Inter_700Bold", fontSize: 14 },
  comparePrice: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 15 },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  emptyBox: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15 },
});
