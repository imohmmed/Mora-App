import React from "react";
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
  transparent?: boolean;
}

export function HomeHeader({
  favoritesCount = 0,
  transparent = false,
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
  const iconColor = transparent ? "#FFFFFF" : colors.foreground;

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: topPadding + 8,
          backgroundColor: transparent ? "transparent" : colors.background,
          borderBottomColor: transparent ? "transparent" : colors.border,
          borderBottomWidth: transparent ? 0 : 1,
        },
      ]}
    >
      <View style={styles.row}>

        {/* ── Logo ── */}
        <View style={styles.logoPill}>
          <RNImage source={LOGO} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={{ flex: 1 }} />

        {/* ── Notifications ── */}
        <View style={styles.iconBtnWrap}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            onPress={() => router.push("/notifications" as any)}
            testID="notifications-btn"
          >
            <Feather name="bell" size={21} color={iconColor} />
          </Pressable>
          {notificationCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>
                {notificationCount > 9 ? "9+" : notificationCount}
              </Text>
            </View>
          )}
        </View>

        {/* ── Favourites ── */}
        <View style={styles.iconBtnWrap}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            onPress={() => router.push("/wishlist" as any)}
            testID="favorites-btn"
          >
            <Feather name="heart" size={21} color={iconColor} />
          </Pressable>
          {favoritesCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>
                {favoritesCount > 9 ? "9+" : favoritesCount}
              </Text>
            </View>
          )}
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  logoPill: {
    paddingHorizontal: 4,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 92,
    height: 30,
  },
  iconBtnWrap: {
    position: "relative",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
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
