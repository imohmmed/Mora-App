import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";

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

function NativeTabLayout() {
  return (
    <NativeTabs minimizeBehavior="never">
      <NativeTabs.Trigger name="index">
        <TabIcon sf={{ default: "house", selected: "house.fill" }} />
        <TabLabel>Home</TabLabel>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <TabIcon sf={{ default: "magnifyingglass", selected: "magnifyingglass" }} />
        <TabLabel>Search</TabLabel>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cart">
        <TabIcon sf={{ default: "bag", selected: "bag.fill" }} />
        <TabLabel>Bag</TabLabel>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <TabIcon sf={{ default: "person", selected: "person.fill" }} />
        <TabLabel>Account</TabLabel>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

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
      sceneContainerStyle={{ paddingTop: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0.5,
          borderTopColor: colors.border,
          elevation: 0,
          paddingBottom: isWeb ? 4 : safeAreaInsets.bottom,
          height: isWeb ? 56 : undefined,
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
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
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
          tabBarLabel: ({ color, focused }) => (
            <Text style={{ color, fontFamily: focused ? "Inter_700Bold" : "Inter_500Medium", fontSize: 10, letterSpacing: 0.3 }}>
              HOME
            </Text>
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
          tabBarLabel: ({ color, focused }) => (
            <Text style={{ color, fontFamily: focused ? "Inter_700Bold" : "Inter_500Medium", fontSize: 10, letterSpacing: 0.3 }}>
              SEARCH
            </Text>
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
                <SymbolView name={focused ? "bag.fill" : "bag"} tintColor={color} size={24} />
              ) : (
                <Feather name="shopping-bag" size={22} color={color} />
              )}
              {totalItems > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.tabBadgeText}>{totalItems > 9 ? "9+" : totalItems}</Text>
                </View>
              )}
            </View>
          ),
          tabBarLabel: ({ color, focused }) => (
            <Text style={{ color, fontFamily: focused ? "Inter_700Bold" : "Inter_500Medium", fontSize: 10, letterSpacing: 0.3 }}>
              BAG
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, focused }) =>
            isIOS && SymbolView ? (
              <SymbolView name={focused ? "person.fill" : "person"} tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
          tabBarLabel: ({ color, focused }) => (
            <Text style={{ color, fontFamily: focused ? "Inter_700Bold" : "Inter_500Medium", fontSize: 10, letterSpacing: 0.3 }}>
              ACCOUNT
            </Text>
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
