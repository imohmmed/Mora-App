import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface CategoryTabsProps {
  categories: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export function CategoryTabs({
  categories,
  activeIndex,
  onChange,
}: CategoryTabsProps) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scroll, { borderBottomColor: colors.border }]}
      contentContainerStyle={styles.content}
    >
      {categories.map((cat, i) => (
        <Pressable
          key={cat}
          style={styles.tab}
          onPress={() => onChange(i)}
        >
          <Text
            style={[
              styles.text,
              {
                color:
                  activeIndex === i
                    ? colors.foreground
                    : colors.mutedForeground,
                fontFamily:
                  activeIndex === i ? "Inter_700Bold" : "Inter_500Medium",
              },
            ]}
          >
            {cat}
          </Text>
          {activeIndex === i && (
            <View
              style={[styles.underline, { backgroundColor: colors.primary }]}
            />
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 14,
    marginRight: 22,
    alignItems: "center",
  },
  text: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  underline: {
    position: "absolute",
    bottom: 0,
    height: 2,
    left: 0,
    right: 0,
  },
});
