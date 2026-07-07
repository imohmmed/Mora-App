/**
 * GlassBackButton — Liquid Glass circle back button.
 * iOS 26+ : native SwiftUI glassEffect circle (LiquidGlassBg)
 * iOS < 26 : BlurView circle (systemThinMaterial)
 * Web      : semi-transparent frosted pill
 */
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { LiquidGlassBg, isIOS26Plus } from "@/components/LiquidGlassBg";

type Props = {
  onPress: () => void;
  color?: string;
  style?: object;
  noBackground?: boolean;
};

export function GlassBackButton({ onPress, color, style, noBackground }: Props) {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const iconColor = color ?? (noBackground ? "#FFFFFF" : isDark ? "#FFFFFF" : "#000000");

  if (noBackground) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={12}
        testID="back-btn"
        style={({ pressed }) => [styles.btnPlain, style, pressed && { opacity: 0.65 }]}
      >
        <Feather name="arrow-left" size={24} color={iconColor} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      testID="back-btn"
      style={({ pressed }) => [styles.btn, style, pressed && { opacity: 0.65 }]}
    >
      {Platform.OS === "ios" && isIOS26Plus ? (
        /* iOS 26+ — native Liquid Glass */
        <LiquidGlassBg />
      ) : Platform.OS !== "web" ? (
        /* iOS < 26 — BlurView */
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={68}
          tint={isDark ? "systemThinMaterialDark" : "systemThinMaterial"}
        />
      ) : (
        /* Web — frosted pill */
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.webBg,
            {
              backgroundColor: isDark ? "rgba(28,28,30,0.68)" : "rgba(255,255,255,0.72)",
              borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.12)",
            },
          ]}
        />
      )}
      <Feather name="arrow-left" size={20} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  btnPlain: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  webBg: {
    borderRadius: 21,
    borderWidth: 0.5,
  },
});
