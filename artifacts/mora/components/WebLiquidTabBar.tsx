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

import React, { useEffect, useRef } from "react";
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

type IconName = React.ComponentProps<typeof Feather>["name"];
const ROUTE_META: Record<string, { label: string; icon: IconName; iconFocused: IconName }> = {
  index:   { label: "HOME",    icon: "home",         iconFocused: "home" },
  search:  { label: "SEARCH",  icon: "search",       iconFocused: "search" },
  cart:    { label: "BAG",     icon: "shopping-bag", iconFocused: "shopping-bag" },
  account: { label: "ACCOUNT", icon: "user",         iconFocused: "user" },
};

// ─── CSS injection ────────────────────────────────────────────────────────────
// We need backdrop-filter + transitions that can't live in RN StyleSheet.
function useGlassCSS(isDark: boolean) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "mora-web-liquid-glass";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    // language=CSS
    el.textContent = `
      /* ── bar shell — Apple-style frosted glass ──────────────────────────── */
      .mora-lg-bar {
        backdrop-filter: blur(40px) saturate(180%) brightness(${isDark ? "1.15" : "1.04"});
        -webkit-backdrop-filter: blur(40px) saturate(180%) brightness(${isDark ? "1.15" : "1.04"});
        transition: background 0.3s ease;
        box-shadow:
          0 16px 48px rgba(0,0,0,${isDark ? "0.50" : "0.22"}),
          0 4px 16px  rgba(0,0,0,${isDark ? "0.35" : "0.14"}),
          inset 0 1.5px 0 rgba(255,255,255,${isDark ? "0.18" : "0.80"}),
          inset 0 -0.5px 0 rgba(0,0,0,${isDark ? "0.20" : "0.06"});
      }
      /* ── active pill ────────────────────────────────────────────────────── */
      .mora-lg-pill {
        backdrop-filter: blur(20px) saturate(180%) brightness(${isDark ? "1.4" : "1.08"});
        -webkit-backdrop-filter: blur(20px) saturate(180%) brightness(${isDark ? "1.4" : "1.08"});
        transition: background 0.28s ease, box-shadow 0.28s ease;
        box-shadow:
          0 4px 18px rgba(0,0,0,${isDark ? "0.30" : "0.14"}),
          0 1px 4px  rgba(0,0,0,${isDark ? "0.20" : "0.08"}),
          inset 0 1px 0 rgba(255,255,255,${isDark ? "0.30" : "0.90"}),
          inset 0 -0.5px 0 rgba(0,0,0,${isDark ? "0.15" : "0.04"});
      }
      /* ── press state ────────────────────────────────────────────────────── */
      .mora-lg-tab:active { opacity: 0.70; transform: scale(0.94); }
      .mora-lg-tab { transition: opacity 0.14s ease, transform 0.14s ease; cursor: pointer; }

      /* ── glass sheen on bar (top-edge light catch) ───────────────────────── */
      .mora-lg-bar::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(
          170deg,
          ${isDark
            ? "rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.01) 40%, rgba(255,255,255,0.04) 100%"
            : "rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.05) 48%, rgba(255,255,255,0.18) 100%"
          }
        );
        pointer-events: none;
      }

      /* ── glass sheen on pill ────────────────────────────────────────────── */
      .mora-lg-pill::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(
          155deg,
          ${isDark
            ? "rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.02) 55%"
            : "rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.12) 55%"
          }
        );
        pointer-events: none;
      }
    `;
  }, [isDark]);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function WebLiquidTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const isDark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();
  const { totalItems } = useCart();

  useGlassCSS(isDark);

  // Animate pill position on tab switch
  const pillAnim = useRef(new Animated.Value(0)).current;
  const visibleRoutes = state.routes.filter((r) => !HIDDEN.has(r.name));
  const activeVisibleIndex = visibleRoutes.findIndex(
    (r) => r.key === state.routes[state.index]?.key
  );

  useEffect(() => {
    Animated.spring(pillAnim, {
      toValue: activeVisibleIndex,
      useNativeDriver: false,
      tension: 260,
      friction: 22,
    }).start();
  }, [activeVisibleIndex]);

  // Glass colours — Apple-style: opaque enough to be seen on white
  const barBg    = isDark ? "rgba(22,22,26,0.82)"  : "rgba(234,235,240,0.88)";
  const barBorder = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.85)";
  const pillBg   = isDark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.96)";
  const pillBorder = isDark ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,1.0)";
  const inactiveTint = isDark ? "rgba(255,255,255,0.50)" : "rgba(0,0,0,0.42)";

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
    borderRadius: 28,
    borderWidth: 1.5,
    overflow: "visible",
    paddingHorizontal: 6,
    paddingVertical: 6,
    position: "relative",
  },
  pill: {
    position: "absolute",
    top: 6,
    borderRadius: 20,
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
