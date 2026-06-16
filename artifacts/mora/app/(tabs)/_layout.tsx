/**
 * Tab layout — Safe Liquid Glass tab bar, no @expo/ui SwiftUI components.
 *
 * Tab bar strategy:
 *  • iOS 26+ : GlassView (expo-glass-effect) as tabBarBackground → true Liquid Glass bg
 *  • iOS < 26 : BlurView as tabBarBackground
 *  • Android  : solid bg
 *  • Web      : WebLiquidTabBar custom tabBar renderer
 *
 * IMPORTANT: We export ErrorBoundary so expo-router uses our custom error UI
 * (with full error text) instead of its silent default "Something went wrong".
 */
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
import { useNativeReady } from "@/hooks/useNativeReady";
import { WebLiquidTabBar } from "@/components/WebLiquidTabBar";
import { ErrorFallback } from "@/components/ErrorFallback";

// ── expo-symbols (graceful fallback to Feather) ───────────────────────────────
let SymbolView: any = null;
try { SymbolView = require("expo-symbols").SymbolView; } catch {}

// ── expo-glass-effect (GlassView — stable, NOT @expo/ui) ─────────────────────
let GlassView: any = null;
let isLiquidGlassAvail: () => boolean = () => false;
try {
  const g = require("expo-glass-effect");
  GlassView = g.GlassView;
  isLiquidGlassAvail = g.isLiquidGlassAvailable ?? (() => false);
} catch {}

// ── Segment-level ErrorBoundary for expo-router ───────────────────────────────
// expo-router catches errors in each route segment before they bubble to our
// app-level ErrorBoundary. Exporting this makes expo-router use our custom UI.
export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return <ErrorFallback error={error} resetError={retry} />;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function TabLayout() {
  const colors      = useColors();
  const colorScheme = useColorScheme();
  const isDark      = colorScheme === "dark";
  const isIOS       = Platform.OS === "ios";
  const isWeb       = Platform.OS === "web";
  const insets      = useSafeAreaInsets();
  const { totalItems } = useCart();

  // Defer glass until native bridge is ready (prevents first-render crashes)
  const nativeReady  = useNativeReady();
  const glassEnabled = isIOS && nativeReady && !!GlassView && isLiquidGlassAvail();

  const active   = isDark ? "#FFFFFF" : "#000000";
  const inactive = isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.30)";

  function Icon({
    sf, sfActive, feather, color, size = 23,
  }: {
    sf: string; sfActive?: string; feather: string; color: string; size?: number;
  }) {
    if (isIOS && SymbolView) {
      return <SymbolView name={sfActive ?? sf} tintColor={color} size={size} />;
    }
    return <Feather name={feather as any} size={size - 1} color={color} />;
  }

  const TAB_H = 54;

  return (
    <Tabs
      tabBar={isWeb ? (p: any) => <WebLiquidTabBar {...p} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor:   active,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: isWeb
          ? { display: "none" }
          : {
              position: "absolute",
              height: TAB_H + insets.bottom,
              backgroundColor: "transparent",
              borderTopWidth: glassEnabled ? 0 : StyleSheet.hairlineWidth,
              borderTopColor: String(colors.border),
              elevation: 0,
            },
        tabBarItemStyle: { paddingVertical: 6 },
        // ── SAFE glass background — only expo-glass-effect GlassView ──────────
        // NO @expo/ui components here (they caused native crashes)
        tabBarBackground: () => {
          if (isWeb) return null;
          if (glassEnabled) {
            return (
              <GlassView
                style={StyleSheet.absoluteFill}
                glassEffectStyle="regular"
                colorScheme={isDark ? "dark" : "light"}
              />
            );
          }
          if (isIOS) {
            return (
              <BlurView
                intensity={90}
                tint={isDark ? "systemChromeMaterialDark" : "systemChromeMaterial"}
                style={StyleSheet.absoluteFill}
              />
            );
          }
          return null;
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) => (
            <Icon
              sf="house"
              sfActive={focused ? "house.fill" : "house"}
              feather="home"
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => (
            <Icon sf="magnifyingglass" feather="search" color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ focused, color }) => (
            <Icon
              sf="message.circle"
              sfActive={focused ? "message.circle.fill" : "message.circle"}
              feather="message-circle"
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen name="wishlist" options={{ href: null }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ focused, color }) => (
            <View>
              <Icon
                sf="bag"
                sfActive={focused ? "bag.fill" : "bag"}
                feather="shopping-bag"
                color={color as string}
              />
              {totalItems > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeTxt}>
                    {totalItems > 9 ? "9+" : totalItems}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ focused, color }) => (
            <Icon
              sf="person"
              sfActive={focused ? "person.fill" : "person"}
              feather="user"
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
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
  badgeTxt: { color: "#fff", fontSize: 8, fontWeight: "700" },
});
