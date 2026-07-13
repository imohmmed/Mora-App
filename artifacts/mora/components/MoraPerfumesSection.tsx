import { forwardRef, useImperativeHandle, useState } from "react";
import {
  Dimensions, Pressable, ScrollView, StyleSheet, Text, View,
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

const COLLECTION_ID = "col_mora-perfumes";
const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 3) / 2;
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
          <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? "#0274C1" : "#FFF"} />
        </Pressable>
        <Pressable
          style={[styles.plusBtn, isAr ? { left: 8 } : { right: 8 }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onQuickAdd(product); }}
          hitSlop={10}
        >
          <Feather name="plus" size={20} color="#FFF" />
        </Pressable>
      </ProductImageCarousel>
      <View style={[styles.info, isAr && { alignItems: "flex-end" }]}>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
          {product.title}
        </Text>
        {(() => {
          const modelDef = product.optionDefinitions?.find((d: any) => d.type === "model");
          const colorDef = product.optionDefinitions?.find((d: any) => d.type === "color");
          const models = modelDef?.modelEntries?.filter((m: any) => m.nameEn?.trim()) ?? [];
          const hexes = colorDef?.colorEntries?.map((e: any) => e.hex).filter(Boolean) ?? [];
          return (
            <>
              {models.length > 0 && (
                <View style={{ flexDirection: isAr ? "row-reverse" : "row", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
                  {models.slice(0, 5).map((m: any) => (
                    <View key={m.id} style={{ width: 34, height: 34, borderRadius: 3, overflow: "hidden", backgroundColor: "#E0E0E0", borderWidth: 0.5, borderColor: "rgba(0,0,0,0.12)" }}>
                      {m.image ? <Image source={{ uri: m.image }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : null}
                    </View>
                  ))}
                </View>
              )}
              {hexes.length > 0 && (
                <View style={{ flexDirection: isAr ? "row-reverse" : "row", flexWrap: "wrap", gap: 4, marginBottom: 3 }}>
                  {hexes.slice(0, 7).map((hex: string, i: number) => (
                    <View key={i} style={{ width: 16, height: 16, borderRadius: 2, backgroundColor: hex, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.15)" }} />
                  ))}
                </View>
              )}
            </>
          );
        })()}
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

export type MoraPerfumesSectionHandle = { loadMore: () => void };

export const MoraPerfumesSection = forwardRef<MoraPerfumesSectionHandle, {}>(function MoraPerfumesSection(_props, ref) {
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

  // No-op — this section is now a self-contained horizontal carousel with no
  // pagination-on-scroll behavior; kept so the parent's ref call is harmless.
  useImperativeHandle(ref, () => ({ loadMore: () => {} }), []);

  if (products.length === 0) return null;

  const label = isAr ? "عطور مورا" : "MORA PERFUMES";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isAr && { flexDirection: "row-reverse" }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{label}</Text>
        <Pressable
          onPress={() => router.push(`/collection/${COLLECTION_ID}` as any)}
          hitSlop={8}
        >
          <Text style={[styles.seeAll, { color: colors.mutedForeground }]}>
            {isAr ? "عرض الكل" : "See all"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        snapToInterval={CARD_W + 1}
        decelerationRate="fast"
        style={isAr ? styles.mirrorScroll : undefined}
      >
        {products.map((product) => (
          <View key={product.id} style={isAr ? styles.mirrorItem : undefined}>
            <PerfumeCard product={product} onQuickAdd={setQuickAddProduct} />
          </View>
        ))}
      </ScrollView>

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
            comparePrice: quickAddProduct.comparePrice,
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
});

const styles = StyleSheet.create({
  container: { marginTop: 0, marginBottom: 0 },
  mirrorScroll: { transform: [{ scaleX: -1 }] },
  mirrorItem:   { transform: [{ scaleX: -1 }] },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  seeAll: {
    fontFamily: "Cairo_500Medium",
    fontSize: 12,
  },
  scroll: { gap: 1, paddingHorizontal: 1 },
  card: { width: CARD_W },
  cardImage: { width: CARD_W, height: CARD_H, borderRadius: 0, overflow: "hidden", position: "relative" },
  info: { paddingTop: 8, gap: 3, paddingHorizontal: 3 },
  title: { fontFamily: "Cairo_500Medium", fontSize: 12, lineHeight: 16 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  price: { fontFamily: "Cairo_700Bold", fontSize: 13 },
  comparePrice: { fontFamily: "Cairo_400Regular", fontSize: 11, textDecorationLine: "line-through" },
  discBadge: { position: "absolute", top: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, zIndex: 2 },
  discText: { fontFamily: "Cairo_600SemiBold", fontSize: 10, color: "#FFF" },
  heartBtn: { position: "absolute", top: 8, zIndex: 2 },
  plusBtn: { position: "absolute", bottom: 8, zIndex: 2 },
});
