import { useCallback } from "react";
import {
  Dimensions, FlatList, Pressable, StyleSheet, Text, View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { fetchCollection } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import type { Product, Variant } from "@/lib/types";
import { useState } from "react";

const COLLECTION_ID = "col_mora-perfumes";
const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 21) / 2;
const CARD_H = CARD_W * 1.4;

const CARD_COLORS = [
  "#E8EDF5", "#F0EBE3", "#E8F0E8", "#F5EDEB",
  "#EBF0F5", "#F5EBF5", "#FFF3E0", "#F0F0F0",
];
function cardColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CARD_COLORS[h % CARD_COLORS.length];
}

function PerfumeCard({
  product,
  onQuickAdd,
}: {
  product: Product;
  onQuickAdd: (p: Product) => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const { lang } = useLanguage();
  const { isWishlisted, toggle } = useWishlist();
  const isAr = lang === "ar";
  const liked = isWishlisted(product.id);
  const hasDiscount = product.comparePrice != null && product.comparePrice > product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.price / product.comparePrice!) * 100)
    : 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.93 : 1 }]}
      onPress={() => router.push(`/product/${product.id}` as any)}
    >
      <ProductImageCarousel
        images={product.images ?? []}
        style={[styles.cardImage, { backgroundColor: cardColor(product.id) }]}
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
          <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? "#0274C1" : "#FFF"} />
        </Pressable>
        <Pressable
          style={[styles.plusBtn, { right: 8 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onQuickAdd(product); }}
          hitSlop={10}
        >
          <Feather name="plus" size={22} color="#FFF" />
        </Pressable>
      </ProductImageCarousel>
      <View style={[styles.info, isAr && { alignItems: "flex-end" }]}>
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
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {product.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: "#E53935" }]}>{formatIQD(product.price)}</Text>
          {hasDiscount && (
            <Text style={[styles.comparePrice, { color: colors.mutedForeground }]}>
              {formatIQD(product.comparePrice!)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export function MoraPerfumesSection() {
  const colors = useColors();
  const router = useRouter();
  const { lang } = useLanguage();
  const { addItem } = useCart();
  const isAr = lang === "ar";
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);

  const { data: collection } = useQuery({
    queryKey: ["collection", COLLECTION_ID],
    queryFn: () => fetchCollection(COLLECTION_ID),
    staleTime: 120_000,
  });

  const products = collection?.products ?? [];
  if (products.length === 0) return null;

  const label = isAr ? "عطور مورا" : "MORA PERFUMES";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{label}</Text>
        <Pressable
          onPress={() => router.push(`/collection/${COLLECTION_ID}` as any)}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={[styles.seeAll, { color: colors.mutedForeground }]}>
            {isAr ? "عرض الكل" : "SEE ALL"}
          </Text>
        </Pressable>
      </View>

      {/* Horizontal scroll */}
      <FlatList
        horizontal
        data={products}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <PerfumeCard product={item} onQuickAdd={setQuickAddProduct} />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10, gap: 1 }}
        snapToInterval={CARD_W + 1}
        decelerationRate="fast"
        inverted={isAr}
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
  container: { marginTop: 8, marginBottom: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  seeAll: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  card: { width: CARD_W },
  cardImage: { width: "100%", height: CARD_H, borderRadius: 0 },
  info: { paddingTop: 8, gap: 3, paddingHorizontal: 2 },
  title: { fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 17 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  price: { fontFamily: "Inter_700Bold", fontSize: 13 },
  comparePrice: { fontFamily: "Inter_400Regular", fontSize: 11, textDecorationLine: "line-through" },
  discBadge: { position: "absolute", top: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#FFF" },
  heartBtn: { position: "absolute", top: 8 },
  plusBtn: { position: "absolute", bottom: 10 },
});
