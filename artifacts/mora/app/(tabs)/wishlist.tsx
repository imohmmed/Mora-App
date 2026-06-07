import React from "react";
import {
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueries } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { MoraLogo } from "@/components/MoraLogo";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { fetchProduct } from "@/lib/api";
import type { Product } from "@/lib/types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const CARD_COLORS = [
  "#E8EDF5", "#F0EBE3", "#E8F0E8", "#F5EDEB",
  "#EBF0F5", "#F5EBF5", "#FFF3E0", "#F0F0F0",
];

function cardColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CARD_COLORS[h % CARD_COLORS.length];
}

function WishlistSkeleton() {
  return (
    <View style={{ width: CARD_WIDTH }}>
      <View style={{ width: "100%", height: CARD_WIDTH * 1.3, borderRadius: 2, backgroundColor: "#F0F0F0" }} />
      <View style={{ paddingTop: 8, gap: 6 }}>
        <View style={{ height: 10, width: 60, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 12, width: 100, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 14, width: 50, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
      </View>
    </View>
  );
}

function WishlistCard({ product }: { product: Product }) {
  const colors = useColors();
  const router = useRouter();
  const { toggle } = useWishlist();
  const { addItem } = useCart();
  const imageUri = product.images?.[0];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.95 : 1 }]}
      onPress={() => router.push(`/product/${product.id}`)}
    >
      <View style={[styles.cardImage, { backgroundColor: cardColor(product.id) }]}>
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
        <Pressable
          style={styles.removeBtn}
          onPress={() => {
            toggle(product.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Feather name="heart" size={16} color="#E53935" />
        </Pressable>
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardVendor, { color: colors.mutedForeground }]}>
          {product.vendor ?? "Mora"}
        </Text>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
          {product.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.cardPrice, { color: colors.foreground }]}>
            ${product.price.toFixed(2)}
          </Text>
          {product.comparePrice != null && product.comparePrice > product.price && (
            <Text style={[styles.comparePrice, { color: colors.mutedForeground }]}>
              ${product.comparePrice.toFixed(2)}
            </Text>
          )}
        </View>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.foreground }]}
          onPress={() => {
            const variant = product.variants?.[0];
            addItem({
              productId: product.id,
              variantId: variant?.id ?? product.id,
              title: product.title,
              vendor: product.vendor ?? "Mora",
              price: variant?.price ?? product.price,
              quantity: 1,
              size: variant?.option1,
              color: variant?.option2,
              image: product.images?.[0],
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        >
          <Text style={styles.addBtnText}>ADD TO BAG</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function WishlistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { ids } = useWishlist();
  const wishlistIds = [...ids];

  const topPadding = isWeb ? 0 : insets.top;
  const bottomPadding = isWeb ? 0 : insets.bottom;

  const results = useQueries({
    queries: wishlistIds.map((productId) => ({
      queryKey: ["product", productId],
      queryFn: () => fetchProduct(productId),
      staleTime: 60_000,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const isAnyError = results.some((r) => r.isError);
  const products = results.filter((r) => r.data != null).map((r) => r.data as Product);
  const refetchAll = () => results.forEach((r) => r.refetch());
  const isRefetching = results.some((r) => r.isRefetching);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 8, borderBottomColor: colors.border },
        ]}
      >
        <MoraLogo size="small" />
        {wishlistIds.length > 0 && (
          <Text style={[styles.itemCount, { color: colors.mutedForeground }]}>
            {wishlistIds.length} saved
          </Text>
        )}
      </View>

      {wishlistIds.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBg, { backgroundColor: colors.secondary }]}>
            <Feather name="heart" size={48} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Your wishlist is empty
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Tap the heart on any product to save it here
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: bottomPadding + 80,
            paddingHorizontal: 16,
            paddingTop: 16,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetchAll}
              tintColor={colors.primary}
            />
          }
        >
          {isLoading ? (
            <View style={styles.grid}>
              {Array.from({ length: wishlistIds.length || 4 }).map((_, i) => (
                <WishlistSkeleton key={i} />
              ))}
            </View>
          ) : isAnyError ? (
            <View style={styles.errorBox}>
              <Feather name="wifi-off" size={36} color={colors.border} />
              <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
                Could not load some items
              </Text>
              <Pressable
                onPress={refetchAll}
                style={[styles.retryBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.retryText, { color: colors.foreground }]}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.grid}>
              {products.map((product) => (
                <WishlistCard key={product.id} product={product} />
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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemCount: { fontFamily: "Inter_500Medium", fontSize: 14 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 22, textAlign: "center" },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  card: { width: CARD_WIDTH },
  cardImage: {
    width: "100%",
    height: CARD_WIDTH * 1.3,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 6,
    zIndex: 1,
  },
  cardInfo: { paddingTop: 8, gap: 4 },
  cardVendor: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cardTitle: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardPrice: { fontFamily: "Inter_700Bold", fontSize: 14 },
  comparePrice: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textDecorationLine: "line-through",
  },
  addBtn: { paddingVertical: 8, alignItems: "center", borderRadius: 2, marginTop: 4 },
  addBtnText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.5 },
  errorBox: { alignItems: "center", paddingVertical: 40, gap: 12 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderRadius: 4 },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
