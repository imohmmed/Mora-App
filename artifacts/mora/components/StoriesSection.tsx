import React, { useMemo } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { fetchCollectionProducts } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import type { Product, StoryRow, StoryItem } from "@/lib/types";

const { width: SCREEN_W } = Dimensions.get("window");

const CIRCLE = 68;
const ITEM_W  = CIRCLE + 12;
const CARD_W  = 110;
const CARD_H  = 145;

// ─── Story Circle ─────────────────────────────────────────────────────────────
function StoryCircle({ item }: { item: StoryItem }) {
  const router = useRouter();
  const colors = useColors();

  return (
    <Pressable
      style={({ pressed }) => [styles.circleWrap, { opacity: pressed ? 0.75 : 1 }]}
      onPress={() => { if (item.linkUrl) router.push(item.linkUrl as any); }}
    >
      <View style={[styles.circleOuter, { borderColor: colors.primary }]}>
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
        {item.title}
      </Text>
    </Pressable>
  );
}

// ─── Product Mini Card ────────────────────────────────────────────────────────
function ProductMiniCard({ product }: { product: Product }) {
  const router = useRouter();
  const colors = useColors();
  const image  = product.images?.[0];

  return (
    <Pressable
      style={({ pressed }) => [styles.productCard, { opacity: pressed ? 0.88 : 1 }]}
      onPress={() => router.push(`/product/${product.id}` as any)}
    >
      <View style={[styles.productImage, { backgroundColor: "#EEF0F4" }]}>
        {image ? (
          <Image
            source={{ uri: image }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
          />
        ) : null}
      </View>
      <View style={styles.productInfo}>
        <Text style={[styles.productTitle, { color: colors.foreground }]} numberOfLines={1}>
          {product.title}
        </Text>
        <Text style={[styles.productPrice, { color: colors.foreground }]}>
          {formatIQD(product.price)}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Story Row Section (one row + its products) ───────────────────────────────
function StoryRowSection({
  row,
  activeGender,
  isLast,
}: {
  row: StoryRow;
  activeGender?: string;
  isLast: boolean;
}) {
  const colors = useColors();

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

  return (
    <View style={[styles.rowWrap, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      {row.title ? (
        <Text style={[styles.rowTitle, { color: colors.mutedForeground }]}>
          {row.title}
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

      {/* Products below the circles */}
      {hasProducts && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productsScroll}
          decelerationRate="fast"
        >
          {(products ?? []).map((product) => (
            <ProductMiniCard key={product.id} product={product} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function StoriesSection({
  rows,
  activeFilter,
}: {
  rows: StoryRow[];
  activeFilter?: { gender?: string; category?: string; tag?: string };
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
    borderWidth: 2,
    padding: 2,
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
    paddingTop: 12,
    gap: 8,
  },
  productCard: {
    width: CARD_W,
  },
  productImage: {
    width: CARD_W,
    height: CARD_H,
    overflow: "hidden",
    borderRadius: 6,
    position: "relative",
  },
  productInfo: {
    paddingTop: 6,
    gap: 2,
  },
  productTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 14,
  },
  productPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    lineHeight: 16,
  },
});
