/**
 * LiquidGlassBg — iOS 26 Liquid Glass background layer.
 *
 * Renders a native SwiftUI GlassEffectContainer via @expo/ui Host.
 * Only active on iOS 26+ (Platform.Version >= 26). All other platforms return null.
 *
 * The component handles its own useNativeReady guard internally —
 * call sites do NOT need to guard separately.
 *
 * Usage: place as the FIRST child of any container that needs a glass background.
 *   <View style={s.bar}>
 *     <LiquidGlassBg />
 *     <Text>Content above glass</Text>
 *   </View>
 *
 * NOTE: Do NOT nest SwiftUI components inside GlassEffectContainer.
 * GlassEffectContainer is itself a SwiftUIVirtualViewObjC; adding children
 * via React Native triggers _addSubview: on it which throws EXC_CRASH.
 */
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { useNativeReady } from "@/hooks/useNativeReady";

export const isIOS26Plus =
  Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;

let Host: any = null;
let GlassContainer: any = null;

if (isIOS26Plus) {
  try {
    const ui = require("@expo/ui/swift-ui") as Record<string, any>;
    Host           = ui["Host"];
    GlassContainer = ui["GlassEffectContainer"];
  } catch {}
}

type Props = {
  /** Extra style applied to the Host (position, dimensions). Defaults to absoluteFill. */
  style?: object;
};

export function LiquidGlassBg({ style }: Props) {
  const nativeReady = useNativeReady();

  if (!isIOS26Plus || !Host || !GlassContainer || !nativeReady) return null;

  return (
    <Host
      style={[StyleSheet.absoluteFill, style]}
      ignoreSafeArea="all"
      pointerEvents="none"
    >
      <GlassContainer style={{ flex: 1 }} />
    </Host>
  );
}
