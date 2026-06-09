/**
 * WebLiquidTabBar — True Liquid Glass tab bar for Expo web.
 *
 * Three-layer architecture (WWDC 2025 technique):
 *  • Layer 1 — backdrop-filter: blur(8px) saturate(280%)
 *      Low blur keeps content readable; high saturation amplifies the
 *      colours beneath the bar so it "picks up" the page as you scroll.
 *  • Layer 2 — ::before specular sheen
 *      Linear gradient + inset box-shadow simulate light catching the
 *      glass edge (top bright rim, side catches).
 *  • Layer 3 — SVG feDisplacementMap refraction (Chrome/Edge only)
 *      Organic feTurbulence noise drives a feDisplacementMap that bends
 *      the pixels behind the bar — real glass refraction.
 *      Safari / Firefox fall back to Layer 1 silently.
 *
 * Dark-mode variants via @media (prefers-color-scheme: dark).
 * SVG filter injected once into <body> and referenced by CSS.
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/context/ThemeContext";

const PRIMARY = "#0274C1";
const HIDDEN = new Set(["wishlist"]);

type IconName = React.ComponentProps<typeof Feather>["name"];
const ROUTE_META: Record<string, { label: string; icon: IconName; iconFocused: IconName }> = {
  index:   { label: "HOME",    icon: "home",         iconFocused: "home" },
  search:  { label: "SEARCH",  icon: "search",       iconFocused: "search" },
  cart:    { label: "BAG",     icon: "shopping-bag", iconFocused: "shopping-bag" },
  account: { label: "ACCOUNT", icon: "user",         iconFocused: "user" },
};

// ─── SVG refraction filter (injected once into <body>) ─────────────────────
// Chrome/Edge: feDisplacementMap bends pixels behind the bar like real glass.
// Safari/Firefox: filter ignored — CSS backdrop-filter fallback takes over.
function useGlassSVG() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "mora-glass-svg";
    if (document.getElementById(id)) return;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", id);
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.cssText = "position:absolute;overflow:hidden;width:0;height:0";
    svg.innerHTML = `
      <defs>
        <filter id="mora-glass-filter" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.006"
            numOctaves="2" seed="72" result="noise"/>
          <feGaussianBlur in="noise" stdDeviation="2.5" result="softNoise"/>
          <feDisplacementMap in="BackgroundImage" in2="softNoise"
            scale="16" xChannelSelector="R" yChannelSelector="G"
            result="displaced"/>
          <feSpecularLighting in="softNoise" surfaceScale="4"
            specularConstant="1.1" specularExponent="20"
            lighting-color="rgba(255,255,255,0.80)" result="spec">
            <fePointLight x="50%" y="8%" z="110"/>
          </feSpecularLighting>
          <feBlend in="displaced" in2="spec" mode="screen"/>
        </filter>
      </defs>`;
    document.body.appendChild(svg);
  }, []);
}

// ─── CSS injection ─────────────────────────────────────────────────────────
// Layer 1 (all browsers): blur(8px) + saturate(280%) — low blur so content
//   stays readable; high saturation amplifies background colours so the bar
//   visually "picks up" whatever is scrolling behind it.
// Layer 2 (::before): specular gradient + inset rim — simulates light
//   catching the glass edge, the key visual cue of real glass.
// Layer 3 (@supports, Chrome/Edge): SVG feDisplacementMap refraction added
//   on top of layers 1+2 for true optical distortion.
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

      /* ══ GRADIENT FADE — blurs content into tab bar from above ═════════════
         A tall gradient mask sits above the floating bar so the page content
         softly dissolves before reaching the glass.  Light/dark are toggled
         by adding .mora-lg-dark to the wrapper via JS (isDark prop).        */

      .mora-lg-wrapper {
        /* clip so ::before stays inside the wrapper */
        overflow: visible;
      }
      .mora-lg-wrapper::before {
        content: '';
        position: absolute;
        bottom: 0;
        left: -40px;
        right: -40px;
        height: 110px;
        pointer-events: none;
        z-index: 0;
        /* Light: fade to white */
        background: linear-gradient(
          to bottom,
          transparent          0%,
          rgba(255,255,255,0.55) 45%,
          rgba(255,255,255,0.90) 80%,
          rgba(255,255,255,0.97) 100%
        );
      }
      /* Dark: fade to black */
      .mora-lg-wrapper.mora-lg-dark::before {
        background: linear-gradient(
          to bottom,
          transparent       0%,
          rgba(0,0,0,0.50)  45%,
          rgba(0,0,0,0.85)  80%,
          rgba(0,0,0,0.94)  100%
        );
      }

      /* ══ LAYER 1 — backdrop colour amplification ════════════════════════════
         ALL dark-mode rules use .mora-lg-dark class (set via JS isDark prop),
         NOT @media prefers-color-scheme, because the app controls theme itself. */

      /* ── Light mode bar ─────────────────────────────────────────────────── */
      .mora-lg-bar {
        isolation: isolate;
        backdrop-filter:         blur(14px) saturate(180%) brightness(1.04);
        -webkit-backdrop-filter: blur(14px) saturate(180%) brightness(1.04);
        transition: background 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
        box-shadow:
          0 16px 48px rgba(0,0,0,0.13),
          0 4px  16px rgba(0,0,0,0.07),
          inset 0 1.5px 0 rgba(255,255,255,0.92),
          inset 0 -0.5px 0 rgba(0,0,0,0.04);
      }

      /* ── Dark mode bar (.mora-lg-dark overrides) ────────────────────────── */
      .mora-lg-dark .mora-lg-bar {
        backdrop-filter:         blur(14px) saturate(200%) brightness(0.90);
        -webkit-backdrop-filter: blur(14px) saturate(200%) brightness(0.90);
        box-shadow:
          0 16px 48px rgba(0,0,0,0.70),
          0 4px  16px rgba(0,0,0,0.50),
          inset 0 1.5px 0 rgba(255,255,255,0.16),
          inset 0 -0.5px 0 rgba(0,0,0,0.45);
      }

      /* ── LAYER 3 — SVG refraction (Chrome/Edge only) ────────────────────── */
      @supports (backdrop-filter: url("#mora-glass-filter")) {
        .mora-lg-bar {
          backdrop-filter:
            url("#mora-glass-filter") blur(6px) saturate(160%) brightness(1.04);
          -webkit-backdrop-filter:
            url("#mora-glass-filter") blur(6px) saturate(160%) brightness(1.04);
        }
        .mora-lg-dark .mora-lg-bar {
          backdrop-filter:
            url("#mora-glass-filter") blur(6px) saturate(190%) brightness(0.90);
          -webkit-backdrop-filter:
            url("#mora-glass-filter") blur(6px) saturate(190%) brightness(0.90);
        }
      }

      /* ── Active pill — light ────────────────────────────────────────────── */
      .mora-lg-pill {
        backdrop-filter:         blur(10px) saturate(160%) brightness(1.06);
        -webkit-backdrop-filter: blur(10px) saturate(160%) brightness(1.06);
        transition: background 0.28s ease, box-shadow 0.28s ease;
        box-shadow:
          0 4px 18px rgba(0,0,0,0.09),
          0 1px 4px  rgba(0,0,0,0.05),
          inset 0 1px 0 rgba(255,255,255,0.96),
          inset 0 -0.5px 0 rgba(0,0,0,0.04);
      }
      /* ── Active pill — dark ─────────────────────────────────────────────── */
      .mora-lg-dark .mora-lg-pill {
        backdrop-filter:         blur(10px) saturate(180%) brightness(0.80);
        -webkit-backdrop-filter: blur(10px) saturate(180%) brightness(0.80);
        box-shadow:
          0 4px 18px rgba(0,0,0,0.50),
          0 1px 4px  rgba(0,0,0,0.30),
          inset 0 1px 0 rgba(255,255,255,0.22),
          inset 0 -0.5px 0 rgba(0,0,0,0.28);
      }

      /* ── Press state ────────────────────────────────────────────────────── */
      .mora-lg-tab:active { opacity: 0.68; transform: scale(0.93); }
      .mora-lg-tab { transition: opacity 0.14s ease, transform 0.14s ease; cursor: pointer; }

      /* ══ LAYER 2 — specular sheen ::before ══════════════════════════════════ */

      /* Light: bright catch + strong rim */
      .mora-lg-bar::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        z-index: 1;
        background: linear-gradient(
          145deg,
          rgba(255,255,255,0.60) 0%,
          rgba(255,255,255,0.08) 40%,
          transparent 58%
        );
        box-shadow:
          inset 0  1.5px 0 rgba(255,255,255,0.90),
          inset 0 -1px   0 rgba(255,255,255,0.18),
          inset  1px 0   0 rgba(255,255,255,0.22),
          inset -1px 0   0 rgba(255,255,255,0.12);
      }
      /* Dark: dim catch + cool rim */
      .mora-lg-dark .mora-lg-bar::before {
        background: linear-gradient(
          145deg,
          rgba(255,255,255,0.10) 0%,
          rgba(255,255,255,0.01) 40%,
          transparent 58%
        );
        box-shadow:
          inset 0  1.5px 0 rgba(255,255,255,0.16),
          inset 0 -1px   0 rgba(80,100,255,0.06),
          inset  1px 0   0 rgba(255,255,255,0.07),
          inset -1px 0   0 rgba(255,255,255,0.04);
      }

      /* Pill sheen — light */
      .mora-lg-pill::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        background: linear-gradient(
          150deg,
          rgba(255,255,255,0.88) 0%,
          rgba(255,255,255,0.12) 52%,
          transparent 68%
        );
      }
      /* Pill sheen — dark */
      .mora-lg-dark .mora-lg-pill::before {
        background: linear-gradient(
          150deg,
          rgba(255,255,255,0.14) 0%,
          rgba(255,255,255,0.01) 52%,
          transparent 68%
        );
      }
    `;
  }, []);
}

// ─── Component ────────────────────────────────────────────────────────────────
export function WebLiquidTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const insets = useSafeAreaInsets();
  const { totalItems } = useCart();

  useGlassCSS();
  useGlassSVG();

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

  // Glass colours.
  // Dark: high alpha so charcoal colour dominates over backdrop blur.
  // Light: slightly transparent — 52% so content shows through frosted glass.
  const barBg      = isDark ? "rgba(18,18,24,0.78)"   : "rgba(255,255,255,0.52)";
  const barBorder  = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.92)";
  const pillBg     = isDark ? "rgba(50,50,60,0.80)"   : "rgba(255,255,255,0.88)";
  const pillBorder = isDark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,1.0)";
  const inactiveTint = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.44)";

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
      // @ts-ignore className valid on web
      className={`mora-lg-wrapper${isDark ? " mora-lg-dark" : ""}`}
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
