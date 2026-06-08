import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

const PRIMARY = "#0274C1";

// @expo/ui requires a custom dev build — not available in Expo Go.
let glassAvailable = false;
let Host: any, ExpoButton: any;
let glassEffectM: any, paddingM: any, tintM: any;
try {
  const ui = require("@expo/ui/swift-ui");
  const mods = require("@expo/ui/swift-ui/modifiers");
  Host = ui.Host;
  ExpoButton = ui.Button;
  glassEffectM = mods.glassEffect;
  paddingM = mods.padding;
  tintM = mods.tint;
  glassAvailable = true;
} catch {}

interface CategoryTabsProps {
  categories: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

function GlassCategoryTabs({ categories, activeIndex, onChange }: CategoryTabsProps) {
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
              <ExpoButton
                label={cat}
                onPress={() => {
                  Haptics.selectionAsync();
                  onChange(i);
                }}
                modifiers={[
                  paddingM({ horizontal: 18, vertical: 9 }),
                  glassEffectM({
                    glass: {
                      variant: "regular",
                      interactive: true,
                      tint: active ? PRIMARY : undefined,
                    },
                    shape: "capsule",
                  }),
                  tintM(active ? "#FFFFFF" : colors.foreground),
                ]}
              />
            </Host>
          );
        })}
      </ScrollView>
    </View>
  );
}

function FallbackCategoryTabs({ categories, activeIndex, onChange }: CategoryTabsProps) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scroll, { borderBottomColor: colors.border }]}
      contentContainerStyle={styles.content}
    >
      {categories.map((cat, i) => (
        <Pressable key={cat} style={styles.tab} onPress={() => onChange(i)}>
          <Text
            style={[
              styles.text,
              {
                color: activeIndex === i ? colors.foreground : colors.mutedForeground,
                fontFamily: activeIndex === i ? "Inter_700Bold" : "Inter_500Medium",
              },
            ]}
          >
            {cat}
          </Text>
          {activeIndex === i && (
            <View style={[styles.underline, { backgroundColor: colors.primary }]} />
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function CategoryTabs(props: CategoryTabsProps) {
  if (!glassAvailable) return <FallbackCategoryTabs {...props} />;
  return <GlassCategoryTabs {...props} />;
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 1, paddingVertical: 6 },
  scroll: { flexGrow: 0, borderBottomWidth: 1 },
  content: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  pillHost: { height: 40 },
  tab: { paddingVertical: 14, marginRight: 22, alignItems: "center" },
  text: { fontSize: 13, letterSpacing: 0.5 },
  underline: { position: "absolute", bottom: 0, height: 2, left: 0, right: 0 },
});
