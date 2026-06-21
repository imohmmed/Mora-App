import React, { useContext } from "react";
import {
  Image as RNImage,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const LOGO = require("@/assets/images/mora-wordmark.png");
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

function getBaseUrl() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}/api` : "/api";
}

interface HomeHeaderProps {
  favoritesCount?: number;
  cartCount?: number;
}

export function HomeHeader({
  favoritesCount = 0,
}: HomeHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const auth = useAuth();
  const token = auth?.token ?? null;

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread", token],
    queryFn: async () => {
      if (!token) return { count: 0 };
      const res = await fetch(`${getBaseUrl()}/store/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!res.ok) return { count: 0 };
      const json = await res.json() as { data: { count: number } };
      return json.data;
    },
    enabled: !!token,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const notificationCount = unreadData?.count ?? 0;

  const topPadding = isWeb ? 0 : insets.top;

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: topPadding + 8,
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <RNImage source={LOGO} style={styles.logo} resizeMode="contain" />
        <View style={{ flex: 1 }} />

        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={() => router.push("/notifications" as any)}
          testID="notifications-btn"
        >
          <Feather name="bell" size={23} color={colors.foreground} />
          {notificationCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>
                {notificationCount > 9 ? "9+" : notificationCount}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={() => router.push("/(tabs)/wishlist")}
          testID="favorites-btn"
        >
          <Feather name="heart" size={23} color={colors.foreground} />
          {favoritesCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>
                {favoritesCount > 9 ? "9+" : favoritesCount}
              </Text>
            </View>
          )}
        </Pressable>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  logo: {
    width: 92,
    height: 30,
  },
  iconBtn: {
    padding: 8,
    position: "relative",
  },
  pressed: { opacity: 0.6 },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
});
