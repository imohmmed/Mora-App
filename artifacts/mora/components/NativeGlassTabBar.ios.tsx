/**
 * NativeGlassTabBar — iOS-only custom tab bar.
 *
 * iOS 26+ + nativeReady: SwiftUI Liquid Glass via the SAME proven pattern as
 * HomeHeader — Host > HStack > Image (SF Symbol) buttons, each with a
 * `glassEffect` modifier. The glass look comes from the MODIFIER, not from a
 * container. Every @expo/ui SwiftUI view lives inside <Host>, otherwise Fabric
 * crashes at launch (-[SwiftUIVirtualViewObjC forwardingTargetForSelector:]).
 *
 * Fallback: BlurView + Pressable (older iOS / bridge not ready).
 */
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCart } from "@/context/CartContext";
import { useNativeReady } from "@/hooks/useNativeReady";
import { isIOS26Plus } from "@/components/LiquidGlassBg";
import { TabEvents, TAB_HOME_SCROLL_TOP, TAB_SEARCH_FOCUS } from "@/lib/tabEvents";

const PRIMARY = "#0274C1";

// ── Inline TabBar props type (avoids importing from private expo-router path) ──
type TabBarProps = {
  state: {
    routes: Array<{ key: string; name: string }>;
    index: number;
  };
  navigation: {
    emit: (e: { type: string; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
  [k: string]: unknown;
};

// ── @expo/ui — loaded once at module init (needs a custom dev build) ─────────
let Host: any = null;
let ExpoHStack: any = null;
let ExpoImage: any = null;
let frameM: ((p: object) => unknown) | null = null;
let glassEffectM: ((p: object) => unknown) | null = null;
let paddingM: ((p: object) => unknown) | null = null;

try {
  const ui   = require("@expo/ui/swift-ui");
  const mods = require("@expo/ui/swift-ui/modifiers");
  Host         = ui.Host;
  ExpoHStack   = ui.HStack;
  ExpoImage    = ui.Image;
  frameM       = mods.frame;
  glassEffectM = mods.glassEffect;
  paddingM     = mods.padding;
} catch {}

// ── Tab metadata ──────────────────────────────────────────────────────────────
const TABS: Record<string, { sf: string; sfActive: string }> = {
  index:   { sf: "house",           sfActive: "house.fill"          },
  search:  { sf: "magnifyingglass", sfActive: "magnifyingglass"      },
  chat:    { sf: "message.circle",  sfActive: "message.circle.fill"  },
  cart:    { sf: "bag",             sfActive: "bag.fill"             },
  account: { sf: "person",          sfActive: "person.fill"          },
};
const TAB_ORDER = ["index", "search", "chat", "cart", "account"];

const ITEM_W   = 54;   // tap target width per icon
const ITEM_H   = 44;   // tap target height per icon
const ITEM_GAP = 2;    // spacing between icons inside the capsule
const PAD_H    = 6;    // capsule internal horizontal padding
const PAD_V    = 5;    // capsule internal vertical padding

// ─────────────────────────────────────────────────────────────────────────────
export function NativeGlassTabBar({ state, navigation }: TabBarProps) {
  const insets      = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark      = colorScheme === "dark";
  const nativeReady = useNativeReady();
  const { totalItems } = useCart();

  const useGlass = nativeReady && isIOS26Plus
    && !!Host && !!ExpoHStack && !!ExpoImage && !!frameM && !!glassEffectM && !!paddingM;

  const visibleRoutes = TAB_ORDER
    .map(n => state.routes.find(r => r.name === n))
    .filter((r): r is (typeof state.routes)[number] => !!r);

  const handlePress = (route: (typeof state.routes)[number]) => {
    const idx       = state.routes.findIndex(r => r.key === route.key);
    const isFocused = state.index === idx;
    if (isFocused && route.name === "index") {
      TabEvents.emit(TAB_HOME_SCROLL_TOP);
      return;
    }
    if (isFocused && route.name === "search") {
      TabEvents.emit(TAB_SEARCH_FOCUS);
      return;
    }
    const ev = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (!isFocused && !ev.defaultPrevented) navigation.navigate(route.name);
  };

  // ── 🌊 Liquid Glass (iOS 26+) — ONE capsule: Host > HStack(glassEffect) > Image[] ──
  if (useGlass) {
    const activeColor   = isDark ? "#FFFFFF" : "#0A0A0A";
    const inactiveColor = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";
    const cartIdx       = TAB_ORDER.indexOf("cart");
    const badgeLeft     = PAD_H + cartIdx * (ITEM_W + ITEM_GAP) + ITEM_W - 16;

    return (
      <View
        style={[styles.glassWrapper, { bottom: Math.max(insets.bottom, 12) + 2 }]}
        pointerEvents="box-none"
      >
        {/* shrink-wrap container so the badge can be positioned over the bar */}
        <View style={styles.glassInner}>
          <Host matchContents style={{ height: ITEM_H + PAD_V * 2 }}>
            <ExpoHStack
              spacing={ITEM_GAP}
              modifiers={[
                paddingM!({ horizontal: PAD_H, vertical: PAD_V }),
                glassEffectM!({
                  glass: { variant: "regular", interactive: true },
                  shape: "capsule",
                }),
              ]}
            >
              {visibleRoutes.map((route) => {
                const def = TABS[route.name];
                if (!def) return null;
                const idx       = state.routes.findIndex(r => r.key === route.key);
                const isFocused = state.index === idx;
                return (
                  <ExpoImage
                    key={route.key}
                    systemName={(isFocused ? def.sfActive : def.sf) as any}
                    size={isFocused ? 25 : 23}
                    color={isFocused ? activeColor : inactiveColor}
                    onPress={() => handlePress(route)}
                    modifiers={[frameM!({ width: ITEM_W, height: ITEM_H })]}
                  />
                );
              })}
            </ExpoHStack>
          </Host>

          {totalItems > 0 && (
            <View pointerEvents="none" style={[styles.floatBadge, { left: badgeLeft }]}>
              <Text style={styles.badgeTxt}>{totalItems > 9 ? "9+" : totalItems}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ── 🫧 BlurView fallback (iOS < 26 or bridge not yet ready) ──────────────
  const active   = isDark ? "#FFFFFF" : "#000000";
  const inactive = isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.30)";

  return (
    <View style={[styles.blurWrapper, { height: 54 + insets.bottom }]}>
      <BlurView
        intensity={90}
        tint={isDark ? "systemChromeMaterialDark" : "systemChromeMaterial"}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.blurRow, { paddingBottom: insets.bottom }]}>
        {visibleRoutes.map((route) => {
          const def = TABS[route.name];
          if (!def) return null;
          const idx       = state.routes.findIndex(r => r.key === route.key);
          const isFocused = state.index === idx;
          const color     = isFocused ? active : inactive;
          return (
            <Pressable
              key={route.key}
              style={styles.blurItem}
              onPress={() => handlePress(route)}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
            >
              <View>
                <SymbolView
                  name={(isFocused ? def.sfActive : def.sf) as any}
                  tintColor={color}
                  size={23}
                />
                {route.name === "cart" && totalItems > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeTxt}>
                      {totalItems > 9 ? "9+" : totalItems}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Liquid Glass layout
  glassWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  glassInner: {
    position: "relative",
  },
  floatBadge: {
    position: "absolute",
    top: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  // BlurView fallback layout
  blurWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.25)",
  },
  blurRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  blurItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -7,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeTxt: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "700",
  },
});
