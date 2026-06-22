/**
 * Tab layout — Liquid Glass tab bar on iOS 26+, BlurView on older iOS.
 *
 * Tab bar strategy:
 *  • iOS 26+ : @expo/ui Host + GlassEffectContainer (native SwiftUI Liquid Glass)
 *  • iOS <26 : expo-blur BlurView (systemChromeMaterial)
 *  • Android : solid bg
 *  • Web     : WebLiquidTabBar custom tabBar renderer
 *
 * NOTE: expo-glass-effect was removed — it caused EXC_BAD_ACCESS (SIGSEGV)
 * during AppContext.registerNativeViews() on iOS 26 beta (null pointer in
 * ViewModuleWrapper.name()). We use @expo/ui Host+GlassEffectContainer instead.
 *
 * IMPORTANT: We export ErrorBoundary so expo-router uses our custom error UI.
 */
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useCart } from "@/context/CartContext";
import { WebLiquidTabBar } from "@/components/WebLiquidTabBar";
import { NativeGlassTabBar } from "@/components/NativeGlassTabBar";
import { ErrorFallback } from "@/components/ErrorFallback";

// ── expo-symbols (graceful fallback to Feather) ───────────────────────────────
let SymbolView: any = null;
try { SymbolView = require("expo-symbols").SymbolView; } catch {}


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
  const { resolvedScheme } = useTheme();
  const isDark      = resolvedScheme === "dark";
  const isIOS       = Platform.OS === "ios";
  const isWeb       = Platform.OS === "web";
  const insets      = useSafeAreaInsets();
  const { totalItems } = useCart();


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
      tabBar={
        isWeb ? (p: any) => <WebLiquidTabBar {...p} />
        : isIOS ? (p: any) => <NativeGlassTabBar {...p} />
        : undefined
      }
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor:   active,
        tabBarInactiveTintColor: inactive,
        // iOS: NativeGlassTabBar renders its own floating bar — hide default
        // Android: solid bg, standard height
        // Web: hidden (WebLiquidTabBar handles it)
        tabBarStyle: (isIOS || isWeb)
          ? { display: "none" }
          : {
              position: "absolute",
              height: TAB_H + insets.bottom,
              backgroundColor: "transparent",
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: String(colors.border),
              elevation: 0,
            },
        tabBarItemStyle: { paddingVertical: 6 },
        tabBarBackground: () => {
          // Android only — iOS uses NativeGlassTabBar, web uses WebLiquidTabBar
          if (isIOS || isWeb) return null;
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
