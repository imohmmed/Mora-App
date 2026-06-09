import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
import { WebLiquidTabBar } from "@/components/WebLiquidTabBar";

// expo-glass-effect and expo-router/unstable-native-tabs require a custom
// dev build. We load them dynamically so the app still runs in Expo Go.
let isLiquidGlassAvailable: () => boolean = () => false;
let NativeTabs: any, TabIcon: any, TabLabel: any;
let SymbolView: any;

try {
  const glassModule = require("expo-glass-effect");
  isLiquidGlassAvailable = glassModule.isLiquidGlassAvailable;
} catch {}

try {
  const nt = require("expo-router/unstable-native-tabs");
  NativeTabs = nt.NativeTabs;
  TabIcon = nt.Icon;
  TabLabel = nt.Label;
} catch {}

try {
  const sym = require("expo-symbols");
  SymbolView = sym.SymbolView;
} catch {}

// ─── iOS 26+ Liquid Glass native tab bar (custom dev build only) ───────────
function NativeTabLayout() {
  return (
    <NativeTabs minimizeBehavior="never">
      <NativeTabs.Trigger name="index">
        <TabIcon sf={{ default: "house", selected: "house.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <TabIcon sf={{ default: "magnifyingglass", selected: "magnifyingglass" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cart">
        <TabIcon sf={{ default: "bag", selected: "bag.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <TabIcon sf={{ default: "person", selected: "person.fill" }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ─── Classic layout (Expo Go / Android / Web) ─────────────────────────────
function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const safeAreaInsets = useSafeAreaInsets();
  const { totalItems } = useCart();

  return (
    <Tabs
      sceneContainerStyle={{ paddingTop: 0, paddingBottom: isWeb ? 84 : 0 }}
      // ── Web: use the CSS Liquid Glass tab bar ──────────────────────────
      tabBar={isWeb ? (props) => <WebLiquidTabBar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: isDark ? "#FFFFFF" : "#000000",
        tabBarInactiveTintColor: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.40)",
        // Web uses WebLiquidTabBar above, so hide the default bar on web
        tabBarStyle: isWeb
          ? { display: "none" }
          : {
              position: "absolute",
              backgroundColor: isIOS ? "transparent" : colors.background,
              borderTopWidth: 0.5,
              borderTopColor: colors.border,
              elevation: 0,
              paddingBottom: safeAreaInsets.bottom,
            },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
          letterSpacing: 0.3,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) =>
            isIOS && SymbolView ? (
              <SymbolView name={focused ? "house.fill" : "house"} tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) =>
            isIOS && SymbolView ? (
              <SymbolView name="magnifyingglass" tintColor={color} size={24} />
            ) : (
              <Feather name="search" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color }) => (
            <Feather name="message-circle" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Bag",
          tabBarIcon: ({ color, focused }) => (
            <View>
              {isIOS && SymbolView ? (
                <SymbolView
                  name={focused ? "bag.fill" : "bag"}
                  tintColor={color}
                  size={24}
                />
              ) : (
                <Feather name="shopping-bag" size={22} color={color} />
              )}
              {totalItems > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.tabBadgeText}>
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
          tabBarIcon: ({ color, focused }) =>
            isIOS && SymbolView ? (
              <SymbolView
                name={focused ? "person.fill" : "person"}
                tintColor={color}
                size={24}
              />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable() && NativeTabs) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  tabBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
});
