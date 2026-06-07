import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Host } from "@expo/ui/swift-ui";
import { glassEffect, padding, tint } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";

const PRIMARY = "#0274C1";

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
    <View style={[styles.wrap, { borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {categories.map((cat, i) => {
          const active = i === activeIndex;
          return (
            <Host key={cat} matchContents style={styles.pillHost}>
              <Button
                label={cat}
                onPress={() => {
                  Haptics.selectionAsync();
                  onChange(i);
                }}
                modifiers={[
                  padding({ horizontal: 18, vertical: 9 }),
                  glassEffect({
                    glass: {
                      variant: "regular",
                      interactive: true,
                      tint: active ? PRIMARY : undefined,
                    },
                    shape: "capsule",
                  }),
                  tint(active ? "#FFFFFF" : colors.foreground),
                ]}
              />
            </Host>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  content: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  pillHost: {
    height: 40,
  },
});
