import React, { useState } from "react";
import {
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { fetchProduct } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import type { Variant } from "@/lib/types";

const CARD_COLORS = [
  "#E8EDF5", "#F0EBE3", "#E8F0E8", "#F5EDEB",
  "#EBF0F5", "#F5EBF5", "#FFF3E0", "#F0F0F0",
];

function cardColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CARD_COLORS[h % CARD_COLORS.length];
}

function ProductDetailSkeleton({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <>
      <View style={[styles.imageBox, { backgroundColor: "#F0F0F0" }]} />
      <View style={{ padding: 20, gap: 14 }}>
        <View style={{ height: 12, width: 80, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 20, width: "80%", backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 20, width: 100, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 12, width: "60%", backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 12, width: "90%", backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 12, width: "70%", backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          {[60, 60, 60, 60].map((w, i) => (
            <View key={i} style={{ height: 44, width: w, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
          ))}
        </View>
      </View>
    </>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { addItem, totalItems } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [added, setAdded] = useState(false);

  const topPadding = isWeb ? 0 : insets.top;
  const bottomPadding = isWeb ? 24 : insets.bottom;

  const { data: product, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id!),
    enabled: !!id,
  });

  const liked = product ? isWishlisted(product.id) : false;
  const activeVariant = selectedVariant ?? (product?.variants?.[0] ?? null);
  const price = activeVariant?.price ?? product?.price ?? 0;
  const comparePrice = product?.comparePrice;
  const bg = product ? cardColor(product.id) : "#F0F0F0";
  const imageUri = product?.images?.[0];

  const handleAddToCart = () => {
    if (!product) return;
    const variant = activeVariant ?? product.variants?.[0];
    addItem({
      productId: product.id,
      variantId: variant?.id ?? product.id,
      title: product.title,
      vendor: product.vendor ?? "Mora",
      price: variant?.price ?? product.price,
      quantity: 1,
      size: variant?.option1,
      color: variant?.option2,
      image: imageUri,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          testID="back-btn"
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Pressable
          onPress={() => router.push("/(tabs)/cart")}
          style={styles.cartHeaderBtn}
          testID="cart-header-btn"
        >
          <Feather name="shopping-bag" size={22} color={colors.foreground} />
          {totalItems > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.cartBadgeText}>{totalItems > 9 ? "9+" : totalItems}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding + 90 }}>
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
          contentContainerStyle={{ paddingBottom: bottomPadding + 90 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          {/* Product Image */}
          <View style={[styles.imageBox, { backgroundColor: bg }]}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <Feather name="shopping-bag" size={80} color={colors.mutedForeground} />
            )}
            <Pressable
              style={[styles.wishlistBtn, { backgroundColor: "rgba(255,255,255,0.9)" }]}
              onPress={() => {
                toggle(product.id);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Feather name="heart" size={22} color={liked ? "#E53935" : "#1A1A1A"} />
            </Pressable>
          </View>

          {/* Product Info */}
          <View style={styles.infoSection}>
            <Text style={[styles.vendor, { color: colors.mutedForeground }]}>
              {product.vendor ?? "Mora"}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {product.title}
            </Text>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.foreground }]}>
                ${price.toFixed(2)}
              </Text>
              {comparePrice != null && comparePrice > price && (
                <>
                  <Text style={[styles.comparePrice, { color: colors.mutedForeground }]}>
                    ${comparePrice.toFixed(2)}
                  </Text>
                  <View style={[styles.saleBadge, { backgroundColor: "#E53935" }]}>
                    <Text style={styles.saleBadgeText}>SALE</Text>
                  </View>
                </>
              )}
            </View>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {product.tags.slice(0, 4).map((tag) => (
                  <View
                    key={tag}
                    style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  >
                    <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Description */}
            {product.description ? (
              <View style={styles.descSection}>
                <Text style={[styles.descLabel, { color: colors.foreground }]}>
                  DESCRIPTION
                </Text>
                <Text style={[styles.description, { color: colors.mutedForeground }]}>
                  {product.description}
                </Text>
              </View>
            ) : null}

            {/* Variants */}
            {product.variants && product.variants.length > 1 && (
              <View style={styles.variantsSection}>
                <Text style={[styles.variantsLabel, { color: colors.foreground }]}>
                  {product.variants[0]?.option1 ? "SIZE" : "OPTIONS"}
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
                            borderColor: isActive ? colors.foreground : colors.border,
                            backgroundColor: isActive ? colors.foreground : colors.background,
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
                        <Text
                          style={[
                            styles.variantText,
                            { color: isActive ? colors.background : colors.foreground },
                          ]}
                        >
                          {v.option1 ?? v.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Delivery info */}
            <View style={[styles.deliveryRow, { borderColor: colors.border }]}>
              <Feather name="package" size={16} color={colors.primary} />
              <Text style={[styles.deliveryText, { color: colors.mutedForeground }]}>
                Free delivery on orders over $50
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : null}

      {/* Add to Bag button */}
      {product && (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: bottomPadding + 8,
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: added ? "#43A047" : colors.foreground, opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={handleAddToCart}
            testID="add-to-bag-btn"
          >
            <Feather name={added ? "check" : "shopping-bag"} size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>
              {added ? "ADDED TO BAG" : "ADD TO BAG"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  cartHeaderBtn: { padding: 4, position: "relative" },
  cartBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  cartBadgeText: { color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_700Bold" },
  errorBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderRadius: 4 },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  imageBox: {
    height: 360,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  wishlistBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    borderRadius: 24,
    padding: 10,
    zIndex: 1,
  },
  infoSection: { padding: 20, gap: 12 },
  vendor: { fontFamily: "Inter_500Medium", fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 28 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  price: { fontFamily: "Inter_700Bold", fontSize: 22 },
  comparePrice: { fontFamily: "Inter_400Regular", fontSize: 16, textDecorationLine: "line-through" },
  saleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2 },
  saleBadgeText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.5 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  tagText: { fontFamily: "Inter_400Regular", fontSize: 12 },
  descSection: { gap: 8, marginTop: 4 },
  descLabel: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1 },
  description: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },
  variantsSection: { gap: 10, marginTop: 4 },
  variantsLabel: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1 },
  variantsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  variantChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4, borderWidth: 1.5 },
  variantText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderTopWidth: 1,
    marginTop: 4,
  },
  deliveryText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 4,
  },
  addBtnText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 1 },
});
