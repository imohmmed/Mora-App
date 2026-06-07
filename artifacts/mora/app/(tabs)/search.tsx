import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const SCREEN_WIDTH = Dimensions.get("window").width;

const TRENDING = [
  "Oversized blazer",
  "Linen trousers",
  "Summer dresses",
  "Leather sandals",
  "Wide leg jeans",
  "Silk tops",
];

const CATEGORIES = [
  { label: "Women", icon: "user" as const, color: "#F5EBF5" },
  { label: "Men", icon: "user" as const, color: "#EBF0F5" },
  { label: "Beauty", icon: "droplet" as const, color: "#F5F0EB" },
  { label: "Shoes", icon: "box" as const, color: "#EBF5F0" },
  { label: "Bags", icon: "shopping-bag" as const, color: "#F5EBEB" },
  { label: "Sale", icon: "tag" as const, color: "#FFF3E0" },
];

const RECENT_SEARCHES = ["White sneakers", "Midi skirt", "Knit cardigan"];

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const topPadding = isWeb ? 0 : insets.top;
  const bottomPadding = isWeb ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View
          style={[
            styles.searchInputRow,
            {
              backgroundColor: colors.secondary,
              borderColor: focused ? colors.primary : colors.border,
            },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search Mora..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoFocus={false}
            returnKeyType="search"
            testID="search-input"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding + 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {query.length === 0 ? (
          <>
            {/* Recent Searches */}
            {RECENT_SEARCHES.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.foreground }]}
                  >
                    RECENT
                  </Text>
                  <Pressable>
                    <Text
                      style={[styles.clearText, { color: colors.primary }]}
                    >
                      CLEAR
                    </Text>
                  </Pressable>
                </View>
                {RECENT_SEARCHES.map((s) => (
                  <Pressable
                    key={s}
                    style={[
                      styles.recentItem,
                      { borderBottomColor: colors.border },
                    ]}
                    onPress={() => setQuery(s)}
                  >
                    <Feather
                      name="clock"
                      size={15}
                      color={colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.recentText,
                        { color: colors.foreground },
                      ]}
                    >
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Trending */}
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: colors.foreground }]}
              >
                TRENDING
              </Text>
              <View style={styles.tagsWrap}>
                {TRENDING.map((t) => (
                  <Pressable
                    key={t}
                    style={[
                      styles.tag,
                      {
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setQuery(t)}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        { color: colors.foreground },
                      ]}
                    >
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Categories */}
            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: colors.foreground }]}
              >
                BROWSE
              </Text>
              <View style={styles.categoriesGrid}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.label}
                    style={({ pressed }) => [
                      styles.categoryCard,
                      {
                        backgroundColor: cat.color,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    testID={`category-${cat.label}`}
                  >
                    <Feather
                      name={cat.icon}
                      size={24}
                      color={colors.foreground}
                    />
                    <Text
                      style={[
                        styles.categoryLabel,
                        { color: colors.foreground },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyResults}>
            <Feather name="search" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No results for "{query}"
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
            >
              Try different keywords or browse categories
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: 12,
  },
  clearText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  recentText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 4,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 56) / 2,
    height: 90,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  categoryLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  emptyResults: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
