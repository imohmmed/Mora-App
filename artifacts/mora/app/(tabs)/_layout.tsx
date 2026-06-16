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
import { WebLiquidTabBar } from "@/components/WebLiquidTabBar";
import { NativeGlassTabBar } from "@/components/NativeGlassTabBar";

// expo-symbols graceful fallback
let SymbolView: any = null;
try { SymbolView = require("expo-symbols").SymbolView; } catch {}

export default function TabLayout() {
  const colors      = useColors();
  const colorScheme = useColorScheme();
  const isDark      = colorScheme === "dark";
  const isIOS       = Platform.OS === "ios";
  const isWeb       = Platform.OS === "web";
  const insets      = useSafeAreaInsets();
  const { totalItems } = useCart();

  const active   = isDark ? "#FFFFFF" : "#000000";
  const inactive = isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.30)";

  function SFIcon({ sf, feather, color, size = 23 }: {
    sf: string; feather: string; color: string; size?: number;
  }) {
    if (isIOS && SymbolView) {
      return <SymbolView name={sf} tintColor={color} size={size} />;
    }
    return <Feather name={feather as any} size={size - 1} color={color} />;
  }

  // Bottom padding so screen content doesn't hide under the floating tab bar
  const scenePaddingBottom = isWeb ? 84 : isIOS ? 90 : 56 + insets.bottom;

  const TabsAny = Tabs as any;
  return (
    <TabsAny
      sceneContainerStyle={{ paddingBottom: scenePaddingBottom }}
      tabBar={
        isWeb
          ? (props: any) => <WebLiquidTabBar {...props} />
          : isIOS
            ? (props: any) => <NativeGlassTabBar {...props} />
            : undefined
      }
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor:   active,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: isIOS || isWeb
          ? { display: "none" }
          : {
              height: 56 + insets.bottom,
              backgroundColor: String(colors.background),
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: String(colors.border),
              elevation: 0,
            },
        tabBarItemStyle: { paddingVertical: 6 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <SFIcon sf={focused ? "house.fill" : "house"} feather="home" color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => (
            <SFIcon sf="magnifyingglass" feather="search" color={color as string} />
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
          tabBarIcon: ({ color, focused }) => (
            <View>
              <SFIcon
                sf={focused ? "bag.fill" : "bag"}
                feather="shopping-bag"
                color={color as string}
              />
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
              color={color as string}
            />
          ),
        }}
      />
    </TabsAny>
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
