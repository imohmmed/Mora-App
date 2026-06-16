/**
 * GlassBackButton — reusable Liquid Glass circle back button.
 * iOS  : BlurView circle (systemThinMaterial) — always legible over any bg
 * Web  : semi-transparent frosted pill
 */
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

type Props = {
  onPress: () => void;
  /** Override icon colour (e.g. "#fff" when over a dark hero image) */
  color?: string;
  style?: object;
};

export function GlassBackButton({ onPress, color, style }: Props) {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const iconColor = color ?? (isDark ? "#FFFFFF" : "#000000");

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      testID="back-btn"
      style={({ pressed }) => [styles.btn, style, pressed && { opacity: 0.65 }]}
    >
      {Platform.OS !== "web" ? (
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={68}
          tint={isDark ? "systemThinMaterialDark" : "systemThinMaterial"}
        />
      ) : (
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
  webBg: {
    borderRadius: 21,
    borderWidth: 0.5,
  },
});
