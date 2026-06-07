import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Host, HStack, Image, TextField } from "@expo/ui/swift-ui";
import { frame, glassEffect, padding } from "@expo/ui/swift-ui/modifiers";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";

const PRIMARY = "#0274C1";

interface HomeHeaderProps {
  notificationCount?: number;
  favoritesCount?: number;
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
}: HomeHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const goSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/search");
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top + 8,
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        {/* Liquid Glass search field */}
        <View style={styles.searchWrap}>
          <Host style={{ height: 48 }}>
            <HStack
              spacing={8}
              modifiers={[
                frame({ height: 46, maxWidth: 10000 }),
                padding({ horizontal: 14 }),
                glassEffect({
                  glass: { variant: "regular", interactive: true },
                  shape: "capsule",
                }),
              ]}
            >
              <Image systemName="magnifyingglass" size={18} color="#8E8E93" />
              <TextField
                placeholder="Search Mora"
                defaultValue={query}
                onChangeText={setQuery}
                onSubmit={goSearch}
                modifiers={[frame({ maxWidth: 10000 })]}
              />
              <Image
                systemName="camera.fill"
                size={18}
                color={PRIMARY}
                onPress={goSearch}
              />
            </HStack>
          </Host>
        </View>

        {/* Liquid Glass notifications button */}
        <View style={styles.iconWrap}>
          <Host style={{ width: 46, height: 46 }}>
            <Image
              systemName="bell"
              size={20}
              color={colors.foreground}
              onPress={() =>
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              }
              modifiers={[
                frame({ width: 46, height: 46 }),
                glassEffect({
                  glass: { variant: "regular", interactive: true },
                  shape: "circle",
                }),
              ]}
            />
          </Host>
          {notificationCount > 0 && <Badge count={notificationCount} />}
        </View>

        {/* Liquid Glass favorites button */}
        <View style={styles.iconWrap}>
          <Host style={{ width: 46, height: 46 }}>
            <Image
              systemName="heart"
              size={20}
              color={colors.foreground}
              onPress={() =>
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              }
              modifiers={[
                frame({ width: 46, height: 46 }),
                glassEffect({
                  glass: { variant: "regular", interactive: true },
                  shape: "circle",
                }),
              ]}
            />
          </Host>
          {favoritesCount > 0 && <Badge count={favoritesCount} />}
        </View>
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
    gap: 8,
  },
  searchWrap: {
    flex: 1,
  },
  iconWrap: {
    width: 46,
    height: 46,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    zIndex: 10,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
});
