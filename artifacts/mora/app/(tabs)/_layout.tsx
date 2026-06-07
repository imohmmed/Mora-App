import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

function NativeTabLayout() {
  return (
    <NativeTabs minimizeBehavior="never">
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <Icon sf={{ default: "magnifyingglass", selected: "magnifyingglass" }} />
        <Label>Search</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wishlist">
        <Icon sf={{ default: "heart", selected: "heart.fill" }} />
        <Label>Saved</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cart">
        <Icon sf={{ default: "bag", selected: "bag.fill" }} />
        <Label>Bag</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Account</Label>
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
  const { count: wishlistCount } = useWishlist();

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
            isIOS ? (
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
            isIOS ? (
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
        options={{
          title: "Saved",
          tabBarIcon: ({ color, focused }) => (
            <View>
              {isIOS ? (
                <SymbolView name={focused ? "heart.fill" : "heart"} tintColor={color} size={24} />
              ) : (
                <Feather name="heart" size={22} color={color} />
              )}
              {wishlistCount > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.tabBadgeText}>{wishlistCount > 9 ? "9+" : wishlistCount}</Text>
                </View>
              )}
            </View>
          ),
          tabBarLabel: ({ color, focused }) => (
            <Text style={{ color, fontFamily: focused ? "Inter_700Bold" : "Inter_500Medium", fontSize: 10, letterSpacing: 0.3 }}>
              SAVED
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Bag",
          tabBarIcon: ({ color, focused }) => (
            <View>
              {isIOS ? (
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
            isIOS ? (
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
  if (isLiquidGlassAvailable()) {
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
