import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import type { Product } from "@/lib/types";

export interface SpecialCollection {
  slug: string;
  title: string;
  titleAr?: string;
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
const THUMB_W  = (CARD_W - 20 - 4) / 2;   // 2 thumbs + gap inside card padding
const THUMB_H  = THUMB_W * 1.2;

const ICONS: Record<string, string> = {
  "super-deals": "zap",
  "brand-deals": "tag",
  trends:        "trending-up",
  "hot-seller":  "star",
};

const INTERVAL_MS = 3000;

// ─── Thumbnail ────────────────────────────────────────────────────────────────
function Thumb({ product, accentColor }: { product: Product; accentColor: string }) {
  const colors  = useColors();
  const hasDeal = product.comparePrice && product.comparePrice > product.price;
  const disc    = hasDeal
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0;

  return (
    <View style={[styles.thumb, { backgroundColor: colors.secondary }]}>
      <Image
        source={{ uri: product.images?.[0] }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      {hasDeal && (
        <View style={[styles.discBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.discText}>-{disc}%</Text>
        </View>
      )}
    </View>
  );
}

// ─── Card with sliding-window of 2 products ───────────────────────────────────
function CollectionCard({ col }: { col: SpecialCollection }) {
  const colors  = useColors();
  const router  = useRouter();
  const { lang } = useLanguage();
  const icon    = ICONS[col.slug] ?? "grid";
  const displayTitle = lang === "ar" && col.titleAr ? col.titleAr : col.title;
  const prods   = col.products;
  const count   = prods.length;

  // startIdx: which product is in the left slot
  const [startIdx, setStartIdx] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  const nativeDriver = Platform.OS !== "web";

  useEffect(() => {
    if (count <= 2) return;           // nothing to rotate
    const timer = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: nativeDriver }).start(() => {
        setStartIdx((i) => (i + 1) % count);
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: nativeDriver }).start();
      });
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [count]);

  const left  = count > 0 ? prods[startIdx % count]!      : null;
  const right = count > 1 ? prods[(startIdx + 1) % count]! : null;

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
            {displayTitle}
          </Text>
        </View>
        <View style={styles.arrowRow}>
          <Text style={[styles.countText, { color: colors.mutedForeground }]}>{col.total}</Text>
          <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
        </View>
      </View>

      {/* 2-product row (animated) */}
      <Animated.View style={[styles.thumbRow, { opacity: fade }]}>
        {left ? (
          <Thumb product={left} accentColor={col.accentColor} />
        ) : (
          <View style={[styles.thumb, styles.emptyThumb, { backgroundColor: colors.secondary }]}>
            <Feather name="package" size={18} color={colors.mutedForeground} />
          </View>
        )}
        {right ? (
          <Thumb product={right} accentColor={col.accentColor} />
        ) : (
          <View style={[styles.thumb, styles.emptyThumb, { backgroundColor: colors.secondary }]} />
        )}
      </Animated.View>

      {/* Dot indicators — only when > 2 products */}
      {count > 2 && (
        <View style={styles.dots}>
          {Array.from({ length: Math.min(count, 6) }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === startIdx % Math.min(count, 6)
                      ? col.accentColor
                      : colors.border,
                },
              ]}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────
export function SpecialCollectionsGrid({ collections, loading }: Props) {
  const colors = useColors();

  if (loading) {
    return (
      <View style={styles.container}>
        {[[0, 1], [2, 3]].map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((k) => (
              <View
                key={k}
                style={[styles.card, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <View style={[styles.skeletonLine, { backgroundColor: colors.border }]} />
                <View style={styles.thumbRow}>
                  <View style={[styles.thumb, { backgroundColor: colors.border }]} />
                  <View style={[styles.thumb, { backgroundColor: colors.border }]} />
                </View>
              </View>
            ))}
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
  cardHeader:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titleRow:     { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  cardTitle:    { fontFamily: "Cairo_700Bold", fontSize: 12, letterSpacing: 0.2 },
  arrowRow:     { flexDirection: "row", alignItems: "center", gap: 2 },
  countText:    { fontFamily: "Cairo_400Regular", fontSize: 10 },
  thumbRow:     { flexDirection: "row", gap: 4 },
  thumb:        { width: THUMB_W, height: THUMB_H, borderRadius: 7, overflow: "hidden" },
  emptyThumb:   { alignItems: "center", justifyContent: "center" },
  discBadge:    { position: "absolute", top: 4, left: 4, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  discText:     { color: "#fff", fontFamily: "Cairo_700Bold", fontSize: 9 },
  dots:         { flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 2 },
  dot:          { width: 4, height: 4, borderRadius: 2 },
  skeletonLine: { height: 10, width: "55%", borderRadius: 4 },
});
