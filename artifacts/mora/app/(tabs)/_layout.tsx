import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
import { WebLiquidTabBar } from "@/components/WebLiquidTabBar";

// expo-symbols — graceful fallback to Feather if unavailable
let SymbolView: any = null;
try { SymbolView = require("expo-symbols").SymbolView; } catch {}

// NOTE: expo-router/unstable-native-tabs (NativeTabs) is intentionally
// NOT imported. On iOS 26 it triggers a native SwiftUI crash on the first
// render that cannot be caught by a JS error boundary. We use ClassicTabLayout
// (BlurView background) on all platforms.

export default function TabLayout() {
  const colors     = useColors();
  const colorScheme = useColorScheme();
  const isDark     = colorScheme === "dark";
  const isIOS      = Platform.OS === "ios";
  const isWeb      = Platform.OS === "web";
  const insets     = useSafeAreaInsets();
  const { totalItems } = useCart();

  const active   = isDark ? "#FFFFFF" : "#000000";
  const inactive = isDark ? "rgba(255,255,255,0.40)" : "rgba(0,0,0,0.35)";

  function SFIcon({ sf, feather, color, size = 23 }: {
    sf: string; feather: string; color: string; size?: number;
  }) {
    if (isIOS && SymbolView) {
      return <SymbolView name={sf} tintColor={color} size={size} />;
    }
    return <Feather name={feather as any} size={size - 1} color={color} />;
  }

  return (
    <Tabs
      sceneContainerStyle={{ paddingBottom: isWeb ? 84 : 0 }}
      tabBar={isWeb ? (props) => <WebLiquidTabBar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: isWeb
          ? { display: "none" }
          : {
              position: "absolute",
              height: 54 + insets.bottom,
              backgroundColor: isIOS ? "transparent" : colors.background,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.border,
              elevation: 0,
            },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? "systemChromeMaterialDark" : "systemChromeMaterial"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarItemStyle: {
          paddingVertical: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <SFIcon sf={focused ? "house.fill" : "house"} feather="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => (
            <SFIcon sf="magnifyingglass" feather="search" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, focused }) => (
            <SFIcon
              sf={focused ? "message.circle.fill" : "message.circle"}
              feather="message-circle"
              color={color}
            />
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
          title: "Cart",
          tabBarIcon: ({ color, focused }) => (
            <View>
              <SFIcon sf={focused ? "bag.fill" : "bag"} feather="shopping-bag" color={color} />
              {totalItems > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>
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
          tabBarIcon: ({ color, focused }) => (
            <SFIcon
              sf={focused ? "person.fill" : "person"}
              feather="user"
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
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
