import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { MoraLogo } from "@/components/MoraLogo";

interface HomeHeaderProps {
  notificationCount?: number;
  favoritesCount?: number;
}

export function HomeHeader({
  notificationCount = 0,
  favoritesCount = 0,
}: HomeHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";

  const topPadding = isWeb ? 67 : insets.top;

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
      <View style={styles.topRow}>
        <MoraLogo size="small" />
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push("/(tabs)/search")}
            testID="search-icon-btn"
          >
            <Feather name="search" size={22} color={colors.foreground} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.iconBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push("/(tabs)/search")}
            testID="camera-btn"
          >
            <Feather name="camera" size={22} color={colors.foreground} />
          </Pressable>

          <View>
            <Pressable
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.pressed,
              ]}
              testID="notifications-btn"
            >
              <Feather name="bell" size={22} color={colors.foreground} />
              {notificationCount > 0 && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          <View>
            <Pressable
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.pressed,
              ]}
              testID="favorites-btn"
            >
              <Feather name="heart" size={22} color={colors.foreground} />
              {favoritesCount > 0 && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {favoritesCount > 9 ? "9+" : favoritesCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      <Pressable
        style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        onPress={() => router.push("/(tabs)/search")}
        testID="search-bar"
      >
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <Text style={[styles.searchPlaceholder, { color: colors.mutedForeground }]}>
          Search Mora...
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    padding: 8,
    position: "relative",
  },
  pressed: {
    opacity: 0.6,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchPlaceholder: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
});
