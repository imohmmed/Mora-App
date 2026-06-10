import React from "react";
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
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_W } = Dimensions.get("window");

const CIRCLE = 70;
const ITEM_W = CIRCLE + 12;

export type StoryItem = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
};

export type StoryRow = {
  id: string;
  title: string;
  sortOrder: number;
  items: StoryItem[];
};

function StoryCircle({ item }: { item: StoryItem }) {
  const router = useRouter();
  const colors = useColors();

  const handlePress = () => {
    if (item.linkUrl) {
      router.push(item.linkUrl as any);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.circleWrap, { opacity: pressed ? 0.75 : 1 }]}
      onPress={handlePress}
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
      <Text
        style={[styles.circleLabel, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {item.title}
      </Text>
    </Pressable>
  );
}

export function StoriesSection({ rows }: { rows: StoryRow[] }) {
  const colors = useColors();

  if (!rows || rows.length === 0) return null;

  const visibleRows = rows.filter((r) => r.items.length > 0);
  if (visibleRows.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {visibleRows.map((row, rIdx) => (
        <View
          key={row.id}
          style={[styles.rowWrap, rIdx < visibleRows.length - 1 && styles.rowBorder]}
        >
          {row.title ? (
            <Text style={[styles.rowTitle, { color: colors.mutedForeground }]}>
              {row.title}
            </Text>
          ) : null}
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
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingTop: 4,
    paddingBottom: 4,
  },
  rowWrap: {
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  rowTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  rowScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
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
});
