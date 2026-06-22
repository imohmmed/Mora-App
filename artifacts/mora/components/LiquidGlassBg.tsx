/**
 * LiquidGlassBg — iOS 26 Liquid Glass background layer.
 *
 * Renders a native SwiftUI GlassEffectContainer > VStack(glassEffect) via @expo/ui Host.
 * Only active on iOS 26+ (Platform.Version >= 26). All other platforms return null.
 *
 * Usage: place as the FIRST child of any container that needs a glass background.
 *   <View style={s.bar}>
 *     <LiquidGlassBg />
 *     <Text>Content above glass</Text>
 *   </View>
 */
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { useNativeReady } from "@/hooks/useNativeReady";

export const isIOS26Plus =
  Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;

let Host: any = null;
let VStack: any = null;
let glassEffect: any = null;
let frameModifier: any = null;

if (isIOS26Plus) {
  try {
    const ui   = require("@expo/ui/swift-ui") as Record<string, any>;
    Host       = ui["Host"];
    VStack     = ui["VStack"];
    const mods = require("@expo/ui/swift-ui/modifiers") as Record<string, any>;
    glassEffect   = mods["glassEffect"];
    frameModifier = mods["frame"];
  } catch {}
}

type Props = {
  /** Extra style applied to the Host (position, dimensions). Defaults to absoluteFill. */
  style?: object;
};

export function LiquidGlassBg({ style }: Props) {
  const nativeReady = useNativeReady();

  if (!isIOS26Plus || !Host || !VStack || !glassEffect || !nativeReady) return null;

  const modifiers = [
    glassEffect(),
    ...(frameModifier ? [frameModifier({ maxWidth: "infinity", maxHeight: "infinity" })] : []),
  ];

  return (
    <Host
      style={[StyleSheet.absoluteFill, style]}
      ignoreSafeArea="all"
      pointerEvents="none"
    >
      <VStack modifiers={modifiers} />
    </Host>
  );
}
