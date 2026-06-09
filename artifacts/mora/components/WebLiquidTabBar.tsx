/**
 * WebLiquidTabBar — Liquid Glass tab bar for Expo web.
 *
 * Technique:
 *  • backdrop-filter: blur(24px) saturate(200%) — the frosted glass core
 *  • Layered semi-transparent gradient for the glass "sheen" (light refraction)
 *  • Inset highlight border (top edge) to simulate glass catching light
 *  • Active pill: brighter glass layer + primary accent icon
 *  • Smooth CSS transitions for the press-state and active-tab switch
 *
 * We inject a <style> tag for properties that can't be set via React Native
 * Web's inline styles (e.g. ::before pseudo-element sheens, transitions).
 * For backdrop-filter we use the well-known @ts-ignore inline style trick
 * since React Native Web passes unknown CSS properties straight to the DOM.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useCart } from "@/context/CartContext";

const PRIMARY = "#0274C1";
const HIDDEN = new Set(["wishlist"]);

// ─── Reliable dark-mode hook ───────────────────────────────────────────────
// React Native's useColorScheme() is unreliable on Safari iOS / web.
// On web we use window.matchMedia and listen for changes.
function useDarkMode(): boolean {
  const rnScheme = useColorScheme();
  const [webDark, setWebDark] = useState<boolean>(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return rnScheme === "dark";
  });

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setWebDark(e.matches);
    mq.addEventListener("change", handler);
    // Sync on mount in case it changed before listener attached
    setWebDark(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return Platform.OS === "web" ? webDark : rnScheme === "dark";
}

type IconName = React.ComponentProps<typeof Feather>["name"];
const ROUTE_META: Record<string, { label: string; icon: IconName; iconFocused: IconName }> = {
  index:   { label: "HOME",    icon: "home",         iconFocused: "home" },
  search:  { label: "SEARCH",  icon: "search",       iconFocused: "search" },
  cart:    { label: "BAG",     icon: "shopping-bag", iconFocused: "shopping-bag" },
  account: { label: "ACCOUNT", icon: "user",         iconFocused: "user" },
};

// ─── CSS injection ─────────────────────────────────────────────────────────
// Uses @media (prefers-color-scheme: dark) so the bar adapts automatically
// even before JS state updates. Inline RN styles handle backgroundColor.
function useGlassCSS() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "mora-web-liquid-glass";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = `
      /* ── bar shell — light mode ─────────────────────────────────────────── */
      .mora-lg-bar {
        backdrop-filter: blur(72px) saturate(220%) brightness(1.06);
        -webkit-backdrop-filter: blur(72px) saturate(220%) brightness(1.06);
        transition: background 0.3s ease, box-shadow 0.3s ease;
        box-shadow:
          0 20px 60px rgba(0,0,0,0.18),
          0 4px 20px  rgba(0,0,0,0.10),
          inset 0 1.5px 0 rgba(255,255,255,0.90),
          inset 0 -0.5px 0 rgba(0,0,0,0.05);
      }
      /* ── bar shell — dark mode ──────────────────────────────────────────── */
      @media (prefers-color-scheme: dark) {
        .mora-lg-bar {
          backdrop-filter: blur(72px) saturate(240%) brightness(1.20);
          -webkit-backdrop-filter: blur(72px) saturate(240%) brightness(1.20);
          box-shadow:
            0 20px 60px rgba(0,0,0,0.60),
            0 4px 20px  rgba(0,0,0,0.45),
            inset 0 1.5px 0 rgba(255,255,255,0.22),
            inset 0 -0.5px 0 rgba(0,0,0,0.35);
        }
      }

      /* ── active pill — light ────────────────────────────────────────────── */
      .mora-lg-pill {
        backdrop-filter: blur(40px) saturate(200%) brightness(1.10);
        -webkit-backdrop-filter: blur(40px) saturate(200%) brightness(1.10);
        transition: background 0.28s ease, box-shadow 0.28s ease;
        box-shadow:
          0 4px 20px rgba(0,0,0,0.12),
          0 1px 4px  rgba(0,0,0,0.07),
          inset 0 1px 0 rgba(255,255,255,0.95),
          inset 0 -0.5px 0 rgba(0,0,0,0.04);
      }
      /* ── active pill — dark ─────────────────────────────────────────────── */
      @media (prefers-color-scheme: dark) {
        .mora-lg-pill {
          backdrop-filter: blur(40px) saturate(220%) brightness(1.50);
          -webkit-backdrop-filter: blur(40px) saturate(220%) brightness(1.50);
          box-shadow:
            0 4px 20px rgba(0,0,0,0.40),
            0 1px 4px  rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.35),
            inset 0 -0.5px 0 rgba(0,0,0,0.20);
        }
      }

      /* ── press state ────────────────────────────────────────────────────── */
      .mora-lg-tab:active { opacity: 0.70; transform: scale(0.94); }
      .mora-lg-tab { transition: opacity 0.14s ease, transform 0.14s ease; cursor: pointer; }

      /* ── glass sheen on bar — light ─────────────────────────────────────── */
      .mora-lg-bar::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(
          170deg,
          rgba(255,255,255,0.72) 0%,
          rgba(255,255,255,0.05) 48%,
          rgba(255,255,255,0.18) 100%
        );
        pointer-events: none;
      }
      @media (prefers-color-scheme: dark) {
        .mora-lg-bar::before {
          background: linear-gradient(
            170deg,
            rgba(255,255,255,0.13) 0%,
            rgba(255,255,255,0.01) 40%,
            rgba(255,255,255,0.05) 100%
          );
        }
      }

      /* ── glass sheen on pill — light ────────────────────────────────────── */
      .mora-lg-pill::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(
          155deg,
          rgba(255,255,255,0.88) 0%,
          rgba(255,255,255,0.12) 55%
        );
        pointer-events: none;
      }
      @media (prefers-color-scheme: dark) {
        .mora-lg-pill::before {
          background: linear-gradient(
            155deg,
            rgba(255,255,255,0.22) 0%,
            rgba(255,255,255,0.02) 55%
          );
        }
      }
    `;
  }, []);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function WebLiquidTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const isDark = useDarkMode();
  const insets = useSafeAreaInsets();
  const { totalItems } = useCart();

  useGlassCSS();

  // Animate pill position on tab switch
  const pillAnim = useRef(new Animated.Value(0)).current;
  const visibleRoutes = state.routes.filter((r) => !HIDDEN.has(r.name));
  const activeVisibleIndex = visibleRoutes.findIndex(
    (r) => r.key === state.routes[state.index]?.key
  );

  // When on a hidden route (e.g. wishlist), activeVisibleIndex is -1.
  // Clamp to 0 so the pill doesn't animate off-screen, and hide it via opacity.
  const isHiddenRoute = activeVisibleIndex === -1;
  const pillTarget = isHiddenRoute ? 0 : activeVisibleIndex;

  useEffect(() => {
    Animated.spring(pillAnim, {
      toValue: pillTarget,
      useNativeDriver: false,
      tension: 260,
      friction: 22,
    }).start();
  }, [pillTarget]);

  // Glass colours — low alpha so backdrop-filter blur is clearly visible
  const barBg    = isDark ? "rgba(20,20,24,0.52)"   : "rgba(255,255,255,0.48)";
  const barBorder = isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.90)";
  const pillBg   = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.82)";
  const pillBorder = isDark ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,1.0)";
  const inactiveTint = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";

  const TAB_W = 72;  // width per tab
  const BAR_PADDING = 6;
  const PILL_H = 52;

  // Interpolate pill left position
  const pillLeft = pillAnim.interpolate({
    inputRange: visibleRoutes.map((_, i) => i),
    outputRange: visibleRoutes.map((_, i) => BAR_PADDING + i * TAB_W),
  });

  return (
    <View
      style={[
        styles.wrapper,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
      ]}
    >
      {/* ── Glass bar shell ────────────────────────────────────────────── */}
      <View
        // @ts-ignore className is valid on web
        className="mora-lg-bar"
        style={[
          styles.bar,
          {
            backgroundColor: barBg,
            borderColor: barBorder,
            width: visibleRoutes.length * TAB_W + BAR_PADDING * 2,
          },
        ]}
      >
        {/* ── Animated active pill ──────────────────────────────────────── */}
        <Animated.View
          // @ts-ignore className
          className="mora-lg-pill"
          style={[
            styles.pill,
            {
              left: pillLeft,
              width: TAB_W,
              height: PILL_H,
              backgroundColor: pillBg,
              borderColor: pillBorder,
              opacity: isHiddenRoute ? 0 : 1,
            },
          ]}
        />

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        {visibleRoutes.map((route, i) => {
          const focused = i === activeVisibleIndex;
          const meta = ROUTE_META[route.name] ?? {
            label: route.name.toUpperCase(),
            icon: "circle" as IconName,
            iconFocused: "circle" as IconName,
          };
          const isBag = route.name === "cart";

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              // @ts-ignore className
              className="mora-lg-tab"
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityLabel={meta.label}
            >
              {/* Icon */}
              <View style={styles.iconWrap}>
                <Feather
                  name={focused ? meta.iconFocused : meta.icon}
                  size={21}
                  color={focused ? PRIMARY : inactiveTint}
                />
                {/* Cart badge */}
                {isBag && totalItems > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {totalItems > 9 ? "9+" : totalItems}
                    </Text>
                  </View>
                )}
              </View>

              {/* Label */}
              <Text
                style={[
                  styles.label,
                  {
                    color: focused ? PRIMARY : inactiveTint,
                    fontFamily: focused ? "Inter_700Bold" : "Inter_500Medium",
                    opacity: focused ? 1 : 0.85,
                  },
                ]}
              >
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    // No background — we want the content to show through the glass
    pointerEvents: "box-none" as any,
  },
  bar: {
    flexDirection: "row",
    borderRadius: 36,
    borderWidth: 1.5,
    overflow: "visible",
    paddingHorizontal: 6,
    paddingVertical: 6,
    position: "relative",
  },
  pill: {
    position: "absolute",
    top: 6,
    borderRadius: 26,
    borderWidth: 1,
    overflow: "visible",
  },
  tab: {
    width: 72,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    zIndex: 1,
  },
  iconWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 9,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -8,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
});
