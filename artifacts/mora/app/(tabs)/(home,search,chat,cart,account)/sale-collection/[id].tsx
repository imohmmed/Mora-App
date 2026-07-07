import { useState } from "react";
import {
  ActivityIndicator, Dimensions, FlatList, Pressable,
  RefreshControl, StyleSheet, Text, View,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { fetchSaleCollections, fetchSaleCollectionProducts } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import { GlassBackButton } from "@/components/GlassBackButton";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
import type { Product, Variant } from "@/lib/types";

const { width } = Dimensions.get("window");
const CARD_W = (width - 9) / 2;

const CARD_COLORS = ["#E8EDF5","#F0EBE3","#E8F0E8","#F5EDEB","#EBF0F5","#F5EBF5","#FFF3E0","#F0F0F0"];
function cardColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return CARD_COLORS[h % CARD_COLORS.length];
}

function ProductCard({ product, onQuickAdd }: { product: Product; onQuickAdd: (p: Product) => void }) {
  const colors = useColors();
  const router = useRouter();
  const { lang } = useLanguage();
  const { isWishlisted, toggle } = useWishlist();
  const isAr = lang === "ar";
  const liked = isWishlisted(product.id);
  const hasDiscount = product.comparePrice != null && product.comparePrice > product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.price / product.comparePrice!) * 100) : 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.productCard, { opacity: pressed ? 0.93 : 1 }]}
      onPress={() => router.push(`/product/${product.id}` as any)}
    >
      <ProductImageCarousel
        images={product.images ?? []}
        style={[styles.productImage, { backgroundColor: cardColor(product.id) }]}
      >
        {discountPct > 0 && (
          <View style={[styles.discBadge, isAr ? { left: 8, right: undefined } : { right: 8 }]}>
            <Text style={styles.discText}>▼ {discountPct}%</Text>
          </View>
        )}
        <Pressable
          style={[styles.heartBtn, isAr ? { left: 8 } : { right: 8 }]}
          onPress={() => { toggle(product.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          hitSlop={10}
        >
          <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? "#0274C1" : "#FFFFFF"} />
        </Pressable>
        <Pressable
          style={[styles.plusBtn, isAr ? { right: 8 } : { right: 8 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onQuickAdd(product); }}
          hitSlop={10}
        >
          <Feather name="plus" size={22} color="#FFFFFF" />
        </Pressable>
      </ProductImageCarousel>
      <View style={[styles.productInfo, isAr && { alignItems: "flex-end" }]}>
        <Text style={[styles.productTitle, { color: colors.foreground }]} numberOfLines={2}>
          {product.title}
        </Text>
        {(() => {
          const colorDef = product.optionDefinitions?.find((d) => d.type === "color");
          const hexes = colorDef?.colorEntries?.map((e) => e.hex).filter(Boolean) ?? [];
          if (!hexes.length) return null;
          return (
            <View style={{ flexDirection: isAr ? "row-reverse" : "row", gap: 4, marginBottom: 2 }}>
              {hexes.slice(0, 7).map((hex, i) => (
                <View key={i} style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: hex, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.15)" }} />
              ))}
            </View>
          );
        })()}
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: "#E53935" }]}>{formatIQD(product.price)}</Text>
          {hasDiscount && (
            <Text style={[styles.comparePrice, { color: colors.mutedForeground }]}>{formatIQD(product.comparePrice!)}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function SaleCollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();
  const isAr = lang === "ar";
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);

  const { data: collections } = useQuery({
    queryKey: ["sale-collections"],
    queryFn: fetchSaleCollections,
    staleTime: 120_000,
  });
  const collection = collections?.find((c) => c.id === id);

  const { data: products, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["sale-collection-products", id],
    queryFn: () => fetchSaleCollectionProducts(id!),
    enabled: !!id,
    staleTime: 60_000,
  });

  const title = isAr && collection?.titleAr ? collection.titleAr : (collection?.title ?? "");
  const desc = isAr && collection?.descriptionAr ? collection.descriptionAr : (collection?.description ?? "");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlassBackButton top={insets.top + 8} />
      <FlatList
        data={products ?? []}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListHeaderComponent={() => (
          <View style={[styles.heroHeader, isAr && { alignItems: "flex-end" }]}>
            {!!title && (
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>{title}</Text>
            )}
            {!!desc && (
              <Text style={[styles.heroDesc, { color: colors.mutedForeground }]}>{desc}</Text>
            )}
            {!isLoading && !!products?.length && (
              <Text style={[styles.count, { color: colors.mutedForeground }]}>
                {products.length} {isAr ? "منتج" : "items"}
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={() =>
          isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
          ) : (
            <View style={styles.empty}>
              <Feather name="package" size={40} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {isAr ? "لا توجد منتجات" : "No products yet"}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ProductCard product={item} onQuickAdd={setQuickAddProduct} />
        )}
      />
      <QuickAddSheet
        visible={!!quickAddProduct}
        product={quickAddProduct}
        onClose={() => setQuickAddProduct(null)}
        onConfirm={(variant: Variant, qty: number) => {
          if (!quickAddProduct) return;
          addItem({
            productId: quickAddProduct.id,
            variantId: variant.id,
            title: quickAddProduct.title,
            vendor: quickAddProduct.vendor ?? "",
            price: variant.price ?? quickAddProduct.price,
            quantity: qty,
            size: variant.option1 ?? undefined,
            color: variant.option2 ?? undefined,
            image: quickAddProduct.images?.[0],
          });
          setQuickAddProduct(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 4, gap: 1 },
  row: { gap: 1 },
  heroHeader: { paddingHorizontal: 10, paddingVertical: 20, gap: 4 },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 0.3 },
  heroDesc: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  count: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 },
  productCard: { width: CARD_W, flex: 1 },
  productImage: { width: "100%", height: CARD_W * 1.4, borderRadius: 0 },
  productInfo: { paddingTop: 8, gap: 3, paddingHorizontal: 2 },
  productTitle: { fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 17 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  price: { fontFamily: "Inter_700Bold", fontSize: 13 },
  comparePrice: { fontFamily: "Inter_400Regular", fontSize: 11, textDecorationLine: "line-through" },
  discBadge: { position: "absolute", top: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#FFFFFF" },
  heartBtn: { position: "absolute", top: 8 },
  plusBtn: { position: "absolute", bottom: 10 },
  empty: { alignItems: "center", gap: 12, paddingTop: 80 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14 },
});
