import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { Product } from "@/lib/types";

export interface SpecialCollection {
  slug: string;
  title: string;
  description: string;
  heroImage: string;
  accentColor: string;
  total: number;
  products: Product[];
}

interface Props {
  collections: SpecialCollection[];
  loading?: boolean;
}

const { width } = Dimensions.get("window");
const CARD_W   = (width - 16 * 3) / 2;
const IMG_H    = CARD_W * 0.85;

const ICONS: Record<string, string> = {
  "super-deals": "zap",
  "brand-deals": "tag",
  trends:        "trending-up",
  "hot-seller":  "star",
};

const INTERVAL_MS = 3000;

// ─── Single card with rotating product image ──────────────────────────────────
function CollectionCard({ col }: { col: SpecialCollection }) {
  const colors  = useColors();
  const router  = useRouter();
  const icon    = ICONS[col.slug] ?? "grid";
  const prods   = col.products;

  const [idx, setIdx] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  // Auto-rotate every 3 s (only when there's more than one product)
  useEffect(() => {
    if (prods.length <= 1) return;
    const timer = setInterval(() => {
      // fade out → swap index → fade in
      Animated.timing(fade, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
        setIdx((i) => (i + 1) % prods.length);
        Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
      });
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [prods.length]);

  const current = prods[idx];
  const hasDeal = current && current.comparePrice && current.comparePrice > current.price;
  const disc    = hasDeal
    ? Math.round(((current!.comparePrice! - current!.price) / current!.comparePrice!) * 100)
    : 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
      ]}
      onPress={() => router.push(`/collection/${col.slug}` as any)}
      testID={`col-card-${col.slug}`}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <Feather name={icon as any} size={13} color={col.accentColor} />
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
            {col.title}
          </Text>
        </View>
        <View style={styles.arrowRow}>
          <Text style={[styles.countText, { color: colors.mutedForeground }]}>{col.total}</Text>
          <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
        </View>
      </View>

      {/* Product image (rotating) */}
      <View style={[styles.imgWrap, { backgroundColor: colors.secondary }]}>
        {current ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
            <Image
              source={{ uri: current.images?.[0] }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            {hasDeal && (
              <View style={[styles.discBadge, { backgroundColor: col.accentColor }]}>
                <Text style={styles.discText}>-{disc}%</Text>
              </View>
            )}
          </Animated.View>
        ) : (
          <Feather name="package" size={22} color={colors.mutedForeground} />
        )}

        {/* Dot indicators — shown only when ≥2 products */}
        {prods.length > 1 && (
          <View style={styles.dots}>
            {prods.slice(0, Math.min(prods.length, 5)).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === idx % Math.min(prods.length, 5) ? "#fff" : "rgba(255,255,255,0.45)" },
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────
export function SpecialCollectionsGrid({ collections, loading }: Props) {
  const colors = useColors();

  if (loading) {
    const placeholders = [0, 1, 2, 3];
    const rows: [number, number | null][] = [];
    for (let i = 0; i < placeholders.length; i += 2) {
      rows.push([placeholders[i]!, placeholders[i + 1] ?? null]);
    }
    return (
      <View style={styles.container}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {[row[0], row[1]].map((k) =>
              k != null ? (
                <View key={k} style={[styles.card, styles.skeletonCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <View style={[styles.skeletonLine, { backgroundColor: colors.border, width: "55%", height: 10, marginBottom: 4 }]} />
                  <View style={[styles.imgWrap, { backgroundColor: colors.border }]} />
                </View>
              ) : null
            )}
          </View>
        ))}
      </View>
    );
  }

  const rows: [SpecialCollection, SpecialCollection | null][] = [];
  for (let i = 0; i < collections.length; i += 2) {
    rows.push([collections[i]!, collections[i + 1] ?? null]);
  }

  return (
    <View style={styles.container}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          <CollectionCard col={row[0]} />
          {row[1] && <CollectionCard col={row[1]} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { paddingHorizontal: 16, gap: 12, marginTop: 12, marginBottom: 4 },
  row:          { flexDirection: "row", gap: 12 },
  card:         { flex: 1, borderWidth: 1, borderRadius: 14, padding: 10, gap: 8 },
  skeletonCard: { gap: 8 },
  skeletonLine: { borderRadius: 4 },
  cardHeader:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titleRow:     { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  cardTitle:    { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 0.2 },
  arrowRow:     { flexDirection: "row", alignItems: "center", gap: 2 },
  countText:    { fontFamily: "Inter_400Regular", fontSize: 10 },
  imgWrap:      {
    height: IMG_H,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  discBadge:    { position: "absolute", top: 5, left: 5, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  discText:     { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 9 },
  dots:         {
    position: "absolute",
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  dot:          { width: 4, height: 4, borderRadius: 2 },
});
