import React, { useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { fetchCollectionProducts } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
import type { Product, StoryRow, StoryItem, Variant } from "@/lib/types";

const { width: SCREEN_W } = Dimensions.get("window");

const CIRCLE  = 68;
const ITEM_W  = CIRCLE + 12;
const CARD_W  = (SCREEN_W - 32) / 2.5;
const CARD_H  = CARD_W * 1.25;

// ─── Story Circle ─────────────────────────────────────────────────────────────
function StoryCircle({ item }: { item: StoryItem }) {
  const router = useRouter();
  const colors = useColors();
  const { lang } = useLanguage();

  return (
    <Pressable
      style={({ pressed }) => [styles.circleWrap, { opacity: pressed ? 0.75 : 1 }]}
      onPress={() => {
        if (item.collectionId) {
          router.push(`/collection/${item.collectionId}` as any);
        } else if (item.linkUrl) {
          router.push(item.linkUrl as any);
        }
      }}
    >
      <View style={styles.circleOuter}>
        <View style={[styles.circleInner, { backgroundColor: colors.muted }]}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#E8EDF5" }]} />
          )}
        </View>
      </View>
      <Text style={[styles.circleLabel, { color: colors.foreground }]} numberOfLines={2}>
        {lang === "ar" && item.titleAr ? item.titleAr : item.title}
      </Text>
    </Pressable>
  );
}

const CARD_COLORS = [
  "#E8EDF5", "#F0EBE3", "#E8F0E8", "#F5EDEB",
  "#EBF0F5", "#F5EBF5", "#FFF3E0", "#F0F0F0",
];
function cardColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return CARD_COLORS[h % CARD_COLORS.length];
}

// ─── Product Mini Card ────────────────────────────────────────────────────────
function ProductMiniCard({
  product,
  onAddToBag,
}: {
  product: Product;
  onAddToBag: (p: Product) => void;
}) {
  const router = useRouter();
  const colors = useColors();
  const { lang } = useLanguage();
  const { ids, toggle } = useWishlist();
  const liked = ids.has(product.id);
  const isAr = lang === "ar";
  const hasDiscount = product.comparePrice != null && product.comparePrice > product.price;
  const discountPct = hasDiscount
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0;

  return (
    <Pressable
      style={styles.productCard}
      onPress={() => router.push(`/product/${product.id}` as any)}
    >
      <ProductImageCarousel
        images={product.images ?? []}
        style={[styles.productImage, { backgroundColor: cardColor(product.id) }]}
      >
        {/* Discount badge — top-left */}
        {discountPct > 0 && (
          <View style={[styles.discBadge, isAr ? styles.discBadgeAr : styles.discBadgeEn]}>
            <Text style={styles.discText}>▼ {discountPct}%</Text>
          </View>
        )}
        {/* Heart — top-right, no background */}
        <Pressable
          style={[styles.overlayBtn, isAr ? styles.overlayBtnTopAr : styles.overlayBtnTopEn]}
          onPress={() => { toggle(product.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          hitSlop={10}
        >
          <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? "#0274C1" : "#FFFFFF"} />
        </Pressable>
        {/* Add to Bag "+" — bottom-right, no background */}
        <Pressable
          style={[styles.overlayBtn, isAr ? styles.overlayBtnBotAr : styles.overlayBtnBotEn]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onAddToBag(product); }}
          hitSlop={10}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Text style={[styles.productPrice, { color: "#E53935" }]}>
            {formatIQD(product.price)}
          </Text>
          {hasDiscount && (
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, textDecorationLine: "line-through" }}>
              {formatIQD(product.comparePrice!)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Story Row Section (one row + its products) ───────────────────────────────
function StoryRowSection({
  row,
  activeGender,
  isLast,
  circlesOnly,
}: {
  row: StoryRow;
  activeGender?: string;
  isLast: boolean;
  circlesOnly?: boolean;
}) {
  const colors   = useColors();
  const { lang } = useLanguage();
  const { addItem } = useCart();
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);

  const collectionIds = useMemo(
    () => row.items.filter((i) => i.collectionId).map((i) => i.collectionId as string),
    [row.items]
  );

  const { data: products } = useQuery({
    queryKey: ["story-products", row.id, collectionIds.join(","), activeGender ?? "all"],
    queryFn: () => fetchCollectionProducts({ ids: collectionIds, gender: activeGender, limit: 10 }),
    enabled: collectionIds.length > 0,
    staleTime: 120_000,
  });

  const hasProducts = (products?.length ?? 0) > 0;

  const handleQuickAddConfirm = (variant: Variant) => {
    if (!quickAddProduct) return;
    addItem({
      productId: quickAddProduct.id,
      variantId: variant.id,
      title: quickAddProduct.title,
      vendor: quickAddProduct.vendor ?? "",
      price: variant.price ?? quickAddProduct.price,
      quantity: 1,
      size: variant.option1 ?? undefined,
      color: variant.option2 ?? undefined,
      image: quickAddProduct.images?.[0],
    });
    setQuickAddProduct(null);
  };

  return (
    <View style={[styles.rowWrap, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      {(row.title || row.titleAr) ? (
        <Text style={[styles.rowTitle, { color: colors.mutedForeground }]}>
          {lang === "ar" && row.titleAr ? row.titleAr : row.title}
        </Text>
      ) : null}

      {/* Story circles */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowScroll}
        snapToInterval={ITEM_W + 8}
        decelerationRate="fast"
      >
        {row.items.map((item) => (
          <StoryCircle key={item.id} item={item} />
        ))}
      </ScrollView>

      {/* Products horizontal scroll — 2.5 visible */}
      {!circlesOnly && hasProducts && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productsScroll}
          decelerationRate="fast"
          snapToInterval={CARD_W + 10}
        >
          {(products ?? []).map((product) => (
            <ProductMiniCard
              key={product.id}
              product={product}
              onAddToBag={setQuickAddProduct}
            />
          ))}
        </ScrollView>
      )}

      <QuickAddSheet
        visible={!!quickAddProduct}
        product={quickAddProduct}
        onClose={() => setQuickAddProduct(null)}
        onConfirm={handleQuickAddConfirm}
      />
    </View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function StoriesSection({
  rows,
  activeFilter,
  circlesOnly,
}: {
  rows: StoryRow[];
  activeFilter?: { gender?: string; category?: string; tag?: string };
  circlesOnly?: boolean;
}) {
  const colors = useColors();
  if (!rows || rows.length === 0) return null;

  const visibleRows = rows.filter((r) => r.items.length > 0);
  if (visibleRows.length === 0) return null;

  const activeGender = activeFilter?.gender;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {visibleRows.map((row, idx) => (
        <StoryRowSection
          key={row.id}
          row={row}
          activeGender={activeGender}
          isLast={idx === visibleRows.length - 1}
          circlesOnly={circlesOnly}
        />
      ))}
    </View>
  );
}

export type { StoryItem, StoryRow };

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingTop: 4,
    paddingBottom: 4,
  },
  rowWrap: {
    paddingVertical: 12,
  },
  rowTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  rowScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },

  /* Story circle */
  circleWrap: {
    width: ITEM_W,
    alignItems: "center",
    gap: 6,
  },
  circleOuter: {
    width: CIRCLE + 4,
    height: CIRCLE + 4,
    borderRadius: (CIRCLE + 4) / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  circleInner: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  circleLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
    maxWidth: ITEM_W,
  },

  /* Products row */
  productsScroll: {
    paddingHorizontal: 12,
    paddingTop: 14,
    gap: 1,
  },
  productCard: {
    width: CARD_W,
  },
  productImage: {
    width: CARD_W,
    height: CARD_W * 1.4,
    overflow: "hidden",
    borderRadius: 0,
    position: "relative",
  },
  discBadge: { position: "absolute", top: 8, zIndex: 2 },
  discBadgeEn: { left: 8 },
  discBadgeAr: { right: 8 },
  discText: { color: "#E53935", fontFamily: "Inter_700Bold", fontSize: 10 },
  overlayBtn: { position: "absolute", zIndex: 2 },
  overlayBtnTopEn: { top: 8, right: 8 },
  overlayBtnTopAr: { top: 8, left: 8 },
  overlayBtnBotEn: { bottom: 8, right: 8 },
  overlayBtnBotAr: { bottom: 8, left: 8 },
  productInfo: {
    paddingTop: 8,
    gap: 3,
  },
  productTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 16,
  },
  productPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
});
