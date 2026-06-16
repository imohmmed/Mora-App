/**
 * FloatingTabBar — standalone glass tab bar for pages OUTSIDE the (tabs) group.
 * • iOS  : Liquid Glass (GlassEffectContainer) on iOS 26+, BlurView on older iOS
 * • Web  : CSS backdrop-filter glass pill
 * Uses useRouter + usePathname instead of tab navigator props.
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/context/ThemeContext";
import { useNativeReady } from "@/hooks/useNativeReady";
import { isIOS26Plus } from "@/components/LiquidGlassBg";

// ── @expo/ui — Liquid Glass for iOS 26+ ───────────────────────────────────────
let GlassEffectContainer: any = null;
let ExpoButton: any = null;
let buttonStyleMod: any = null;
let frameMod: any = null;
try {
  const ui   = require("@expo/ui/swift-ui");
  const mods = require("@expo/ui/swift-ui/modifiers");
  GlassEffectContainer = ui.GlassEffectContainer;
  ExpoButton           = ui.Button;
  buttonStyleMod       = mods.buttonStyle;
  frameMod             = mods.frame;
} catch {}

// ── SF Symbols (graceful fallback to Feather) ─────────────────────────────────
let SymbolView: any = null;
try { SymbolView = require("expo-symbols").SymbolView; } catch {}

const PRIMARY = "#0274C1";

type IconName = React.ComponentProps<typeof Feather>["name"];

const TABS: { name: string; icon: IconName; sf: string; sfActive: string; path: string | null }[] = [
  { name: "index",   icon: "home",           sf: "house",           sfActive: "house.fill",         path: "/" },
  { name: "search",  icon: "search",         sf: "magnifyingglass", sfActive: "magnifyingglass",     path: "/search" },
  { name: "chat",    icon: "message-circle", sf: "message.circle",  sfActive: "message.circle.fill", path: "/(tabs)/chat" },
  { name: "cart",    icon: "shopping-bag",   sf: "bag",             sfActive: "bag.fill",            path: "/cart" },
  { name: "account", icon: "user",           sf: "person",          sfActive: "person.fill",         path: "/account" },
];

function getActiveRoute(pathname: string): string | null {
  if (pathname === "/" || pathname === "") return "index";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/cart")) return "cart";
  if (pathname.startsWith("/account")) return "account";
  if (pathname.startsWith("/chat")) return "chat";
  return null;
}

function useGlassCSS() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const CSS_ID = "mora-web-liquid-glass";
    if (document.getElementById(CSS_ID)) return;
    const el = document.createElement("style");
    el.id = CSS_ID + "-floating-fallback";
    if (document.getElementById(CSS_ID + "-floating-fallback")) return;
    el.textContent = `
      .mora-lg-wrapper { overflow: visible; }
      .mora-lg-wrapper::before {
        content: ''; position: absolute; bottom: 0; left: -40px; right: -40px;
        height: 130px; pointer-events: none; z-index: 0;
        backdrop-filter: blur(16px) saturate(160%);
        -webkit-backdrop-filter: blur(16px) saturate(160%);
        -webkit-mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.75) 70%, black 100%);
        mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.75) 70%, black 100%);
        background: linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.45) 45%, rgba(255,255,255,0.88) 80%, rgba(255,255,255,0.96) 100%);
      }
      .mora-lg-wrapper.mora-lg-dark::before {
        background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.82) 80%, rgba(0,0,0,0.93) 100%);
      }
      .mora-lg-bar {
        isolation: isolate;
        backdrop-filter: blur(14px) saturate(200%) brightness(1.10);
        -webkit-backdrop-filter: blur(14px) saturate(200%) brightness(1.10);
        transition: background 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
        box-shadow: 0 16px 48px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.14), inset 0 1.5px 0 rgba(0,0,0,0.16), inset 0 -0.5px 0 rgba(255,255,255,0.70);
      }
      .mora-lg-dark .mora-lg-bar {
        backdrop-filter: blur(14px) saturate(200%) brightness(0.90);
        -webkit-backdrop-filter: blur(14px) saturate(200%) brightness(0.90);
        box-shadow: 0 16px 48px rgba(0,0,0,0.70), 0 4px 16px rgba(0,0,0,0.50), inset 0 1.5px 0 rgba(255,255,255,0.16), inset 0 -0.5px 0 rgba(0,0,0,0.45);
      }
      .mora-lg-pill {
        backdrop-filter: blur(10px) saturate(180%) brightness(1.20);
        -webkit-backdrop-filter: blur(10px) saturate(180%) brightness(1.20);
        transition: background 0.28s ease, box-shadow 0.28s ease;
        box-shadow: 0 4px 18px rgba(0,0,0,0.20), 0 1px 4px rgba(0,0,0,0.12), inset 0 1px 0 rgba(0,0,0,0.14), inset 0 -0.5px 0 rgba(255,255,255,0.80);
      }
      .mora-lg-dark .mora-lg-pill {
        backdrop-filter: blur(10px) saturate(180%) brightness(0.80);
        -webkit-backdrop-filter: blur(10px) saturate(180%) brightness(0.80);
        box-shadow: 0 4px 18px rgba(0,0,0,0.50), 0 1px 4px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -0.5px 0 rgba(0,0,0,0.28);
      }
      .mora-lg-tab:active { opacity: 0.68; transform: scale(0.93); }
      .mora-lg-tab { transition: opacity 0.14s ease, transform 0.14s ease; cursor: pointer; }
      .mora-lg-bar::before {
        content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 1;
        background: linear-gradient(145deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.01) 40%, transparent 58%);
        box-shadow: inset 0 1.5px 0 rgba(0,0,0,0.16), inset 0 -1px 0 rgba(0,0,0,0.06), inset 1px 0 0 rgba(0,0,0,0.07), inset -1px 0 0 rgba(0,0,0,0.04);
      }
      .mora-lg-dark .mora-lg-bar::before {
        background: linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.01) 40%, transparent 58%);
        box-shadow: inset 0 1.5px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(80,100,255,0.06), inset 1px 0 0 rgba(255,255,255,0.07), inset -1px 0 0 rgba(255,255,255,0.04);
      }
      .mora-lg-pill::before {
        content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
        background: linear-gradient(150deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.01) 52%, transparent 68%);
      }
      .mora-lg-dark .mora-lg-pill::before {
        background: linear-gradient(150deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.01) 52%, transparent 68%);
      }
    `;
    document.head.appendChild(el);
  }, []);
}

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
    svg.innerHTML = `<defs><filter id="mora-glass-filter" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.006 0.006" numOctaves="2" seed="72" result="noise"/>
      <feGaussianBlur in="noise" stdDeviation="2.5" result="softNoise"/>
      <feDisplacementMap in="BackgroundImage" in2="softNoise" scale="16" xChannelSelector="R" yChannelSelector="G" result="displaced"/>
      <feSpecularLighting in="softNoise" surfaceScale="4" specularConstant="1.1" specularExponent="20" lighting-color="rgba(255,255,255,0.80)" result="spec">
        <fePointLight x="50%" y="8%" z="110"/>
      </feSpecularLighting>
      <feBlend in="displaced" in2="spec" mode="screen"/>
    </filter></defs>`;
    document.body.appendChild(svg);
  }, []);
}

export function FloatingTabBar() {
  if (Platform.OS === "ios") return <StandaloneIOSTabBar />;
  if (Platform.OS !== "web") return null;
  return <FloatingTabBarInner />;
}

// ─────────────────────────────────────────────────────────────────────────────
// iOS — Standalone tab bar (no Tabs navigator context needed)
// ─────────────────────────────────────────────────────────────────────────────
function StandaloneIOSTabBar() {
  const insets      = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark      = colorScheme === "dark";
  const router      = useRouter();
  const pathname    = usePathname();
  const { totalItems } = useCart();
  const nativeReady = useNativeReady();

  const activeRoute = getActiveRoute(pathname);
  const useGlass    = nativeReady && isIOS26Plus && !!GlassEffectContainer && !!ExpoButton;

  const handlePress = (tab: typeof TABS[0]) => {
    if (!tab.path) return;
    if (tab.name === "index") {
      router.push("/");
      return;
    }
    router.push(tab.path as any);
  };

  const cartIdx = TABS.findIndex((t) => t.name === "cart");
  const ITEM_W  = 60;

  // ── Liquid Glass (iOS 26+) ─────────────────────────────────────────────────
  if (useGlass) {
    return (
      <View
        style={[ios.glassWrapper, { bottom: Math.max(insets.bottom, 12) + 4 }]}
        pointerEvents="box-none"
      >
        <GlassEffectContainer spacing={2} style={ios.glassRow}>
          {TABS.map((tab) => {
            const focused = tab.name === activeRoute;
            return (
              <ExpoButton
                key={tab.name}
                systemImage={focused ? tab.sfActive : tab.sf}
                onPress={() => handlePress(tab)}
                modifiers={[
                  buttonStyleMod("glass"),
                  frameMod({ width: 58, height: 52 }),
                ]}
              />
            );
          })}
        </GlassEffectContainer>
        {totalItems > 0 && (
          <View pointerEvents="none" style={[ios.floatBadge, { left: cartIdx * ITEM_W + ITEM_W - 8 }]}>
            <Text style={ios.badgeTxt}>{totalItems > 9 ? "9+" : totalItems}</Text>
          </View>
        )}
      </View>
    );
  }

  // ── BlurView fallback (iOS < 26) ───────────────────────────────────────────
  const active   = isDark ? "#FFFFFF" : "#000000";
  const inactive = isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.30)";

  return (
    <View style={[ios.blurWrapper, { height: 54 + insets.bottom }]}>
      <BlurView
        intensity={90}
        tint={isDark ? "systemChromeMaterialDark" : "systemChromeMaterial"}
        style={StyleSheet.absoluteFill}
      />
      <View style={[ios.blurRow, { paddingBottom: insets.bottom }]}>
        {TABS.map((tab) => {
          const focused = tab.name === activeRoute;
          const color   = focused ? active : inactive;
          return (
            <Pressable
              key={tab.name}
              style={ios.blurItem}
              onPress={() => handlePress(tab)}
              accessibilityRole="button"
            >
              <View>
                {SymbolView ? (
                  <SymbolView
                    name={(focused ? tab.sfActive : tab.sf) as any}
                    tintColor={color}
                    size={23}
                  />
                ) : (
                  <Feather name={tab.icon} size={22} color={color} />
                )}
                {tab.name === "cart" && totalItems > 0 && (
                  <View style={ios.badge}>
                    <Text style={ios.badgeTxt}>{totalItems > 9 ? "9+" : totalItems}</Text>
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

const ios = StyleSheet.create({
  glassWrapper: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  glassRow:     { flexDirection: "row" },
  floatBadge: {
    position: "absolute", top: -4, minWidth: 15, height: 15, borderRadius: 8,
    backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  blurWrapper: { position: "absolute", left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(128,128,128,0.25)" },
  blurRow:  { flex: 1, flexDirection: "row", alignItems: "center" },
  blurItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  badge: {
    position: "absolute", top: -3, right: -7, minWidth: 15, height: 15, borderRadius: 8,
    backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  badgeTxt: { color: "#fff", fontSize: 8, fontWeight: "700" },
});

function FloatingTabBarInner() {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const insets = useSafeAreaInsets();
  const { totalItems } = useCart();
  const router = useRouter();
  const pathname = usePathname();

  useGlassCSS();
  useGlassSVG();

  const activeRoute = getActiveRoute(pathname);
  const activeIndex = TABS.findIndex((t) => t.name === activeRoute);
  const hasActive = activeIndex !== -1;

  const pillAnim = useRef(new Animated.Value(hasActive ? activeIndex : 0)).current;

  useEffect(() => {
    if (!hasActive) return;
    Animated.spring(pillAnim, {
      toValue: activeIndex,
      useNativeDriver: false,
      tension: 260,
      friction: 22,
    }).start();
  }, [activeIndex, hasActive]);

  const barBg      = isDark ? "rgba(18,18,24,0.82)"    : "rgba(245,245,248,0.82)";
  const barBorder  = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.14)";
  const pillBg     = isDark ? "rgba(50,50,60,0.82)"    : "rgba(208,208,215,0.88)";
  const pillBorder = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)";
  const activeTint   = isDark ? "#FFFFFF" : "#000000";
  const inactiveTint = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.40)";

  const TAB_W = 64;
  const BAR_PADDING = 6;
  const PILL_H = 48;

  const pillLeft = pillAnim.interpolate({
    inputRange: TABS.map((_, i) => i),
    outputRange: TABS.map((_, i) => BAR_PADDING + i * TAB_W),
  });

  const handlePress = (tab: typeof TABS[0]) => {
    if (tab.name === "chat") {
      if (typeof window !== "undefined") {
        (window as any).$chatwoot?.toggle?.();
      }
      return;
    }
    if (tab.name === "index") {
      if (activeRoute === "index") {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("mora-scroll-home-top"));
        }
        return;
      }
      router.push("/");
      return;
    }
    router.push(tab.path as any);
  };

  return (
    <View
      // @ts-ignore className valid on web
      className={`mora-lg-wrapper${isDark ? " mora-lg-dark" : ""}`}
      style={[styles.wrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}
    >
      <View
        // @ts-ignore
        className="mora-lg-bar"
        style={[styles.bar, { backgroundColor: barBg, borderColor: barBorder, width: TABS.length * TAB_W + BAR_PADDING * 2 }]}
      >
        <Animated.View
          // @ts-ignore
          className="mora-lg-pill"
          style={[styles.pill, { left: pillLeft, width: TAB_W, height: PILL_H, backgroundColor: pillBg, borderColor: pillBorder, opacity: hasActive ? 1 : 0 }]}
        />
        {TABS.map((tab, i) => {
          const focused = tab.name === activeRoute;
          const isBag = tab.name === "cart";
          return (
            <Pressable
              key={tab.name}
              // @ts-ignore
              className="mora-lg-tab"
              style={styles.tab}
              onPress={() => handlePress(tab)}
              accessibilityRole="button"
              accessibilityLabel={tab.name.toUpperCase()}
            >
              <View style={styles.iconWrap}>
                <Feather name={tab.icon} size={21} color={focused ? activeTint : inactiveTint} />
                {isBag && totalItems > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{totalItems > 9 ? "9+" : totalItems}</Text>
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
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    pointerEvents: "box-none" as any,
    zIndex: 99,
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
  tab: { width: 64, height: 48, alignItems: "center", justifyContent: "center", zIndex: 1 },
  iconWrap: { position: "relative", alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute", top: -5, right: -8,
    minWidth: 15, height: 15, borderRadius: 8,
    backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
});
