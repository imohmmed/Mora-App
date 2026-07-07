import React from "react";
import { Image as RNImage, Pressable, StyleSheet, Text, View } from "react-native";

const LOGO = require("@/assets/images/mora-wordmark.png");
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

const PRIMARY = "#0274C1";

interface HomeHeaderProps {
  notificationCount?: number;
  favoritesCount?: number;
  cartCount?: number;
  transparent?: boolean;
}

function Badge({ count }: { count: number }) {
  return (
    <View style={styles.badge} pointerEvents="none">
      <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
    </View>
  );
}

export function HomeHeader({
  notificationCount = 0,
  favoritesCount = 0,
  transparent = false,
}: HomeHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const iconColor = transparent ? "#FFFFFF" : colors.foreground;

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top + 8,
          backgroundColor: transparent ? "transparent" : colors.background,
          borderBottomWidth: transparent ? 0 : 1,
          borderBottomColor: transparent ? "transparent" : colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <RNImage source={LOGO} style={styles.logo} resizeMode="contain" />
        <View style={{ flex: 1 }} />

        {/* Notifications */}
        <View style={styles.iconWrap}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/notifications" as any);
            }}
          >
            <Feather name="bell" size={22} color={iconColor} />
          </Pressable>
          {notificationCount > 0 && <Badge count={notificationCount} />}
        </View>

        {/* Favourites */}
        <View style={styles.iconWrap}>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/wishlist" as any);
            }}
          >
            <Feather name="heart" size={22} color={iconColor} />
          </Pressable>
          {favoritesCount > 0 && <Badge count={favoritesCount} />}
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
    gap: 8,
  },
  logo: {
    width: 92,
    height: 30,
  },
  iconWrap: {
    position: "relative",
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    zIndex: 10,
  },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_700Bold" },
});
