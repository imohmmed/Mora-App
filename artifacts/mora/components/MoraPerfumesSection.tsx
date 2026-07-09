import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import {
  Dimensions, Pressable, StyleSheet, Text, View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
const CARD_H = SCREEN_W * 1.05;
const PAGE_SIZE = 6;

type FilterKey = "all" | "men" | "women" | "foryou";
const FILTERS: { key: FilterKey; en: string; ar: string }[] = [
  { key: "all",    en: "ALL",     ar: "الكل" },
  { key: "men",    en: "MEN",     ar: "رجالي" },
  { key: "women",  en: "WOMEN",   ar: "نسائي" },
  { key: "foryou", en: "FOR YOU", ar: "مخصص لك" },
];

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
          <View style={[styles.discBadge, isAr ? { left: 10, right: undefined } : { right: 10 }]}>
            <Text style={styles.discText}>▼ {discountPct}%</Text>
          </View>
        )}
        <Pressable
          style={[styles.heartBtn, isAr ? { left: 10 } : { right: 10 }]}
          onPress={() => { toggle(product.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          hitSlop={10}
        >
          <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? "#0274C1" : "#FFF"} />
        </Pressable>
        <Pressable
          style={[styles.plusBtn, { right: 10 }]}
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

export type MoraPerfumesSectionHandle = { loadMore: () => void };

export const MoraPerfumesSection = forwardRef<MoraPerfumesSectionHandle, {}>(function MoraPerfumesSection(_props, ref) {
  const colors = useColors();
  const { lang } = useLanguage();
  const { addItem } = useCart();
  const isAr = lang === "ar";
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [forYouSignal, setForYouSignal] = useState<{ tag?: string; gender?: string }>({});

  const { data: collection } = useQuery({
    queryKey: ["collection", COLLECTION_ID],
    queryFn: () => fetchCollection(COLLECTION_ID),
    staleTime: 120_000,
  });

  const products = collection?.products ?? [];

  useEffect(() => {
    if (filter !== "foryou") return;
    AsyncStorage.getItem("mora_views").then((raw) => {
      const views = JSON.parse(raw || "[]") as { id: string; tags: string[]; gender: string }[];
      if (views.length === 0) { setForYouSignal({}); return; }
      const tagCount: Record<string, number> = {};
      const genderCount: Record<string, number> = {};
      views.slice(0, 15).forEach((v) => {
        v.tags?.forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; });
        if (v.gender && v.gender !== "all") genderCount[v.gender] = (genderCount[v.gender] || 0) + 1;
      });
      const topTag = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a])[0];
      const topGender = Object.keys(genderCount).sort((a, b) => genderCount[b] - genderCount[a])[0];
      setForYouSignal({ tag: topTag, gender: topGender });
    }).catch(() => {});
  }, [filter]);

  const filteredProducts = useMemo(() => {
    switch (filter) {
      case "men":
        return products.filter((p) => p.gender === "men");
      case "women":
        return products.filter((p) => p.gender === "women");
      case "foryou": {
        const { tag, gender } = forYouSignal;
        if (!tag && !gender) return products;
        const matched = products.filter((p) => {
          const genderMatch = gender ? p.gender === gender : false;
          const tagMatch = tag ? (p.tags ?? []).includes(tag) : false;
          return genderMatch || tagMatch;
        });
        return matched.length > 0 ? matched : products;
      }
      default:
        return products;
    }
  }, [products, filter, forYouSignal]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredProducts.length));
  }, [filteredProducts.length]);

  useImperativeHandle(ref, () => ({ loadMore }), [loadMore]);

  if (products.length === 0) return null;

  const label = isAr ? "عطور مورا" : "MORA PERFUMES";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{label}</Text>
      </View>

      {/* Filter tabs */}
      <View style={[styles.filterRow, isAr && { flexDirection: "row-reverse" }]}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => {
                if (filter !== f.key) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilter(f.key);
                }
              }}
              style={[
                styles.filterPill,
                {
                  backgroundColor: active ? colors.primary : "transparent",
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  { color: active ? "#FFFFFF" : colors.foreground },
                ]}
              >
                {isAr ? f.ar : f.en}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Vertical stacked list — loads more as the user scrolls down */}
      {visibleProducts.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Cairo_500Medium", fontSize: 13 }}>
            {isAr ? "لا توجد منتجات" : "No products"}
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 14, gap: 18 }}>
          {visibleProducts.map((item) => (
            <PerfumeCard key={item.id} product={item} onQuickAdd={setQuickAddProduct} />
          ))}
        </View>
      )}

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
});

const styles = StyleSheet.create({
  container: { marginTop: 24, marginBottom: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  emptyBox: { paddingVertical: 40, alignItems: "center" },
  card: { width: "100%" },
  cardImage: { width: "100%", height: CARD_H, borderRadius: 0 },
  info: { paddingTop: 10, gap: 4, paddingHorizontal: 2 },
  title: { fontFamily: "Cairo_500Medium", fontSize: 14, lineHeight: 19 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  price: { fontFamily: "Cairo_700Bold", fontSize: 15 },
  comparePrice: { fontFamily: "Cairo_400Regular", fontSize: 12, textDecorationLine: "line-through" },
  discBadge: { position: "absolute", top: 10, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discText: { fontFamily: "Cairo_600SemiBold", fontSize: 10, color: "#FFF" },
  heartBtn: { position: "absolute", top: 10 },
  plusBtn: { position: "absolute", bottom: 12 },
});
