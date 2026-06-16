/**
 * LiquidGlassBg — iOS 26 Liquid Glass background layer.
 *
 * Renders a native SwiftUI glass panel via @expo/ui Host + GlassEffectContainer.
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

export const isIOS26Plus =
  Platform.OS === "ios" && Number(Platform.Version) >= 26;

let Host: any = null;
let GlassContainer: any = null;
let UIVStack: any = null;
let glassEffectMod: any = null;
let frameMod: any = null;

if (isIOS26Plus) {
  try {
    const ui = require("@expo/ui/swift-ui") as Record<string, any>;
    const mods = require("@expo/ui/swift-ui/modifiers") as Record<string, any>;
    Host           = ui["Host"];
    GlassContainer = ui["GlassEffectContainer"];
    UIVStack       = ui["VStack"];
    glassEffectMod = mods["glassEffect"];
    frameMod       = mods["frame"];
  } catch {}
}

type Props = {
  /** Extra style applied to the Host (position, dimensions). Defaults to absoluteFill. */
  style?: object;
  /** Glass effect variant — default 'regular', 'prominent', 'ultraThin' */
  variant?: "regular" | "prominent" | "ultraThin";
};

export function LiquidGlassBg({ style, variant = "regular" }: Props) {
  if (!isIOS26Plus || !Host || !GlassContainer || !UIVStack) return null;

  const modifiers = [
    glassEffectMod?.({ variant }),
    frameMod?.({ maxWidth: 100_000, maxHeight: 100_000 }),
  ].filter(Boolean);

  return (
    <Host
      style={[StyleSheet.absoluteFill, style]}
      ignoreSafeArea="all"
      pointerEvents="none"
    >
      <GlassContainer style={{ flex: 1 }}>
        <UIVStack style={{ flex: 1 }} modifiers={modifiers} />
      </GlassContainer>
    </Host>
  );
}
