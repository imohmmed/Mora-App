import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface MoraLogoProps {
  size?: "small" | "medium" | "large";
  color?: string;
}

export function MoraLogo({ size = "medium", color }: MoraLogoProps) {
  const colors = useColors();
  const logoColor = color ?? colors.primary;

  const fontSize =
    size === "small" ? 18 : size === "medium" ? 28 : 42;

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.logoText,
          { fontSize, color: logoColor, letterSpacing: fontSize * 0.18 },
        ]}
      >
        MORA
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 5,
    includeFontPadding: false,
  },
});
