import React from "react";
import { Image, StyleSheet, View } from "react-native";

const WORDMARK = require("@/assets/images/mora-wordmark.png");
const ASPECT_RATIO = 1250 / 362;

interface MoraLogoProps {
  size?: "small" | "medium" | "large";
}

export function MoraLogo({ size = "medium" }: MoraLogoProps) {
  const height = size === "small" ? 22 : size === "medium" ? 34 : 52;

  return (
    <View style={styles.container}>
      <Image
        source={WORDMARK}
        style={{ height, width: height * ASPECT_RATIO }}
        resizeMode="contain"
        accessibilityLabel="Mora"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
