import React from "react";
import {
  ActivityIndicator,
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
const CARD_W = (width - 16 * 3) / 2;
const IMG_SIZE = (CARD_W - 16) / 2 - 4;

const ICONS: Record<string, string> = {
  "super-deals": "zap",
  "brand-deals": "tag",
  trends: "trending-up",
  "hot-seller": "star",
};

function CollectionCard({ col }: { col: SpecialCollection }) {
  const colors = useColors();
  const router = useRouter();
  const icon = ICONS[col.slug] ?? "grid";
  const preview = col.products.slice(0, 2);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={() => router.push(`/collection/${col.slug}`)}
      testID={`col-card-${col.slug}`}
    >
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

      <View style={styles.previewRow}>
        {preview.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.secondary }]}>
            <Feather name="package" size={20} color={colors.mutedForeground} />
          </View>
        ) : (
          preview.map((p) => (
            <Pressable
              key={p.id}
              style={[styles.thumb, { backgroundColor: colors.secondary }]}
              onPress={() => router.push(`/product/${p.id}`)}
            >
              <Image
                source={{ uri: p.images?.[0] }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
              {p.comparePrice && p.comparePrice > p.price && (
                <View style={[styles.discBadge, { backgroundColor: col.accentColor }]}>
                  <Text style={styles.discText}>
                    -{Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)}%
                  </Text>
                </View>
              )}
            </Pressable>
          ))
        )}
        {preview.length === 1 && (
          <View style={[styles.thumb, { backgroundColor: colors.secondary }]} />
        )}
      </View>
    </Pressable>
  );
}

export function SpecialCollectionsGrid({ collections, loading }: Props) {
  const colors = useColors();

  if (loading) {
    return (
      <View style={[styles.loadingBox, { borderColor: colors.border }]}>
        <ActivityIndicator color={colors.primary} />
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
  container: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  arrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  countText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },
  previewRow: {
    flexDirection: "row",
    gap: 4,
  },
  thumb: {
    width: IMG_SIZE,
    height: IMG_SIZE,
    borderRadius: 6,
    overflow: "hidden",
  },
  emptyBox: {
    flex: 1,
    height: IMG_SIZE,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  discBadge: {
    position: "absolute",
    top: 3,
    left: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 9,
  },
  loadingBox: {
    height: 180,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
