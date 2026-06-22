import React, { useMemo, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueries } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { GlassBackButton } from "@/components/GlassBackButton";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { formatIQD } from "@/lib/format";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { fetchProduct } from "@/lib/api";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
import type { Product, Variant } from "@/lib/types";

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

const T = {
  en: {
    title:     "Wishlist",
    saved:     (n: number) => `${n} saved`,
    empty:     "Your wishlist is empty",
    emptySub:  "Tap the heart on any product to save it here",
    addToBag:  "ADD TO BAG",
    error:     "Could not load some items",
    retry:     "Retry",
  },
  ar: {
    title:     "المفضلة",
    saved:     (n: number) => `${n} محفوظ`,
    empty:     "قائمة المفضلة فارغة",
    emptySub:  "اضغط على القلب على أي منتج لحفظه هنا",
    addToBag:  "أضف للحقيبة",
    error:     "تعذّر تحميل بعض العناصر",
    retry:     "إعادة المحاولة",
  },
};

function WishlistSkeleton() {
  return (
    <View style={{ width: CARD_WIDTH }}>
      <View style={{ width: "100%", height: CARD_WIDTH * 1.3, borderRadius: 12, backgroundColor: "#F0F0F0" }} />
      <View style={{ paddingTop: 8, gap: 6 }}>
        <View style={{ height: 10, width: 60, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 12, width: 100, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
        <View style={{ height: 14, width: 50, backgroundColor: "#E8E8E8", borderRadius: 4 }} />
      </View>
    </View>
  );
}

function WishlistCard({
  product,
  onAddToBag,
}: {
  product: Product;
  onAddToBag: (product: Product) => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const { toggle } = useWishlist();

  return (
    <View style={{ width: CARD_WIDTH }}>
      <Pressable
        style={({ pressed }) => [{ opacity: pressed ? 0.93 : 1 }]}
        onPress={() => router.push(`/product/${product.id}`)}
      >
        <ProductImageCarousel
          images={product.images ?? []}
          style={[styles.cardImage, { backgroundColor: cardColor(product.id) }]}
          placeholder={<Feather name="shopping-bag" size={32} color={colors.mutedForeground} />}
        >
          <Pressable
            style={styles.removeBtn}
            onPress={() => {
              toggle(product.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Feather name="heart" size={16} color="#E53935" />
          </Pressable>
        </ProductImageCarousel>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardVendor, { color: colors.mutedForeground }]}>
            {product.vendor ?? "Mora"}
          </Text>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
            {product.title}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.cardPrice, { color: colors.foreground }]}>
              {formatIQD(product.price)}
            </Text>
            {product.comparePrice != null && product.comparePrice > product.price && (
              <Text style={[styles.comparePrice]}>
                {formatIQD(product.comparePrice)}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
      <Pressable
        style={[styles.addBtn, { backgroundColor: "#0274C1" }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onAddToBag(product);
        }}
      >
        <Text style={styles.addBtnText}>ADD TO BAG</Text>
      </Pressable>
    </View>
  );
}

export default function WishlistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const { lang } = useLanguage();
  const t = T[lang] ?? T.en;
  const { ids } = useWishlist();
  const { addItem } = useCart();
  const wishlistIds = useMemo(() => [...ids], [ids]);

  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);

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

  const topPad = isWeb ? 0 : insets.top;
  const bottomPad = isWeb ? 0 : insets.bottom;

  const queries = useMemo(
    () =>
      wishlistIds.map((productId) => ({
        queryKey: ["product", productId],
        queryFn: () => fetchProduct(productId),
        staleTime: 60_000,
      })),
    [wishlistIds]
  );

  const results = useQueries({ queries });

  const isLoading = results.some((r) => r.isLoading);
  const isAnyError = results.some((r) => r.isError);
  const products = results.filter((r) => r.data != null).map((r) => r.data as Product);
  const refetchAll = () => results.forEach((r) => r.refetch());
  const isRefetching = results.some((r) => r.isRefetching);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <GlassBackButton onPress={() => router.back()} />
        <Text style={[styles.title, { color: colors.foreground }]}>{t.title}</Text>
        <View style={styles.spacer}>
          {wishlistIds.length > 0 && (
            <Text style={[styles.savedCount, { color: colors.mutedForeground }]}>
              {t.saved(wishlistIds.length)}
            </Text>
          )}
        </View>
      </View>

      <FloatingTabBar />

      {/* ── Content ── */}
      {wishlistIds.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIconBg, { backgroundColor: colors.secondary }]}>
            <Feather name="heart" size={48} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t.empty}</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>{t.emptySub}</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: bottomPad + 100,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 16,
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
            Array.from({ length: wishlistIds.length || 4 }).map((_, i) => (
              <WishlistSkeleton key={i} />
            ))
          ) : isAnyError ? (
            <View style={styles.errorBox}>
              <Feather name="wifi-off" size={36} color={colors.border} />
              <Text style={[styles.errorText, { color: colors.mutedForeground }]}>{t.error}</Text>
              <Pressable onPress={refetchAll} style={[styles.retryBtn, { borderColor: colors.border }]}>
                <Text style={[styles.retryText, { color: colors.foreground }]}>{t.retry}</Text>
              </Pressable>
            </View>
          ) : (
            products.map((product) => (
              <WishlistCard key={product.id} product={product} onAddToBag={handleAddToBag} />
            ))
          )}
        </ScrollView>
      )}

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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, flex: 1, textAlign: "center" },
  spacer: { width: 60, alignItems: "flex-end" },
  savedCount: { fontFamily: "Inter_500Medium", fontSize: 13 },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
    paddingBottom: 80,
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
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center", lineHeight: 22 },
  cardImage: {
    width: "100%",
    height: CARD_WIDTH * 1.3,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    padding: 6,
    zIndex: 1,
  },
  cardInfo: { paddingTop: 8, gap: 3 },
  cardVendor: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cardTitle: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  cardPrice: { fontFamily: "Inter_700Bold", fontSize: 14 },
  comparePrice: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textDecorationLine: "line-through",
    color: "#E53935",
  },
  addBtn: {
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 100,
    marginTop: 8,
  },
  addBtnText: { color: "#FFFFFF", fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.8 },
  errorBox: { width: "100%", alignItems: "center", paddingVertical: 40, gap: 12 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1, borderRadius: 8 },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
});
