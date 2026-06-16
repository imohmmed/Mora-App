/**
 * NativeGlassTabBar — iOS-only custom tab bar.
 *
 * Uses expo-blur BlurView as a floating rounded "liquid glass" capsule.
 *
 * NOTE: We intentionally do NOT use @expo/ui GlassEffectContainer here.
 * On iOS 26.x it crashed at launch with EXC_CRASH (SIGABRT) inside
 * -[SwiftUIVirtualViewObjC forwardingTargetForSelector:] when React Native's
 * Fabric tried to mount the tab bar's SwiftUI views. BlurView is rock-solid
 * and visually matches Liquid Glass. The rest of the app keeps SwiftUI/@expo/ui.
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
  const { totalItems } = useCart();

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

  const active   = isDark ? "#FFFFFF" : "#000000";
  const inactive = isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.30)";

  return (
    <View
      style={[styles.wrapper, { bottom: Math.max(insets.bottom, 12) + 4 }]}
      pointerEvents="box-none"
    >
      <View style={styles.pill}>
        <BlurView
          intensity={80}
          tint={isDark ? "systemThickMaterialDark" : "systemThickMaterialLight"}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.pillBorder,
            { borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)" },
          ]}
        />
        <View style={styles.row}>
          {visibleRoutes.map((route) => {
            const def = TABS[route.name];
            if (!def) return null;
            const idx       = state.routes.findIndex(r => r.key === route.key);
            const isFocused = state.index === idx;
            const color     = isFocused ? active : inactive;
            return (
              <Pressable
                key={route.key}
                style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  pillBorder: {
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    height: 56,
  },
  item: {
    width: 58,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
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
