/**
 * NativeGlassTabBar — iOS-only custom tab bar.
 * iOS 26+ + nativeReady: GlassEffectContainer + Button(buttonStyle:'glass') → true Liquid Glass.
 * Fallback: BlurView + Pressable (looks identical on older iOS).
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

// ── @expo/ui — loaded once at module init (stable SwiftUI view components) ───
let GlassEffectContainer: any = null;
let ExpoButton: any = null;
let buttonStyleMod: ((s: string) => unknown) | null = null;
let frameMod: ((p: object) => unknown) | null = null;

try {
  const ui   = require("@expo/ui/swift-ui");
  const mods = require("@expo/ui/swift-ui/modifiers");
  GlassEffectContainer = ui.GlassEffectContainer;
  ExpoButton           = ui.Button;
  buttonStyleMod       = mods.buttonStyle;
  frameMod             = mods.frame;
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

// ─────────────────────────────────────────────────────────────────────────────
export function NativeGlassTabBar({ state, navigation }: TabBarProps) {
  const insets      = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark      = colorScheme === "dark";
  const nativeReady = useNativeReady();
  const { totalItems } = useCart();

  // Use SwiftUI liquid glass only on iOS 26+ once bridge is ready
  const isGlassAvailable = nativeReady && isIOS26Plus;
  const useGlass = isGlassAvailable && !!GlassEffectContainer && !!ExpoButton
    && !!buttonStyleMod && !!frameMod;

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

  // ── 🌊 Liquid Glass (iOS 26+) ─────────────────────────────────────────────
  if (useGlass) {
    const ITEM_W  = 58 + 2; // button width + container spacing
    const cartIdx = TAB_ORDER.indexOf("cart");

    return (
      <View
        style={[styles.glassWrapper, { bottom: Math.max(insets.bottom, 12) + 4 }]}
        pointerEvents="box-none"
      >
        <GlassEffectContainer spacing={2} style={styles.glassRow}>
          {visibleRoutes.map((route) => {
            const def = TABS[route.name];
            if (!def) return null;
            const idx       = state.routes.findIndex(r => r.key === route.key);
            const isFocused = state.index === idx;
            return (
              <ExpoButton
                key={route.key}
                systemImage={isFocused ? def.sfActive : def.sf}
                onPress={() => handlePress(route)}
                modifiers={[
                  buttonStyleMod!("glass"),
                  frameMod!({ width: 58, height: 52 }),
                ]}
              />
            );
          })}
        </GlassEffectContainer>

        {/* Cart badge floats on top in RN layer */}
        {totalItems > 0 && (
          <View
            pointerEvents="none"
            style={[styles.floatBadge, { left: cartIdx * ITEM_W + ITEM_W - 8 }]}
          >
            <Text style={styles.badgeTxt}>{totalItems > 9 ? "9+" : totalItems}</Text>
          </View>
        )}
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
  glassRow: {
    flexDirection: "row",
  },
  floatBadge: {
    position: "absolute",
    top: -4,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#0274C1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
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
    backgroundColor: "#0274C1",
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
