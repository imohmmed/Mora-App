import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useNativeReady } from "@/hooks/useNativeReady";

const PRIMARY = "#0274C1";

// @expo/ui requires a custom dev build — not available in Expo Go.
// We try to load it at runtime so Expo Go still works.
let glassAvailable = false;
let Host: any, HStack: any, ExpoImage: any, ExpoTextField: any;
let frameM: any, glassEffectM: any, paddingM: any;
try {
  const ui = require("@expo/ui/swift-ui");
  const mods = require("@expo/ui/swift-ui/modifiers");
  Host = ui.Host;
  HStack = ui.HStack;
  ExpoImage = ui.Image;
  ExpoTextField = ui.TextField;
  frameM = mods.frame;
  glassEffectM = mods.glassEffect;
  paddingM = mods.padding;
  glassAvailable = true;
} catch {}

interface HomeHeaderProps {
  notificationCount?: number;
  favoritesCount?: number;
  cartCount?: number;
}

function Badge({ count }: { count: number }) {
  return (
    <View style={styles.badge} pointerEvents="none">
      <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
    </View>
  );
}

function GlassHeader({ notificationCount = 0, favoritesCount = 0 }: HomeHeaderProps) {
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
        <View style={styles.searchWrap}>
          <Host style={{ height: 48 }}>
            <HStack
              spacing={8}
              modifiers={[
                frameM({ height: 46, maxWidth: 10000 }),
                paddingM({ horizontal: 14 }),
                glassEffectM({
                  glass: { variant: "regular", interactive: true },
                  shape: "capsule",
                }),
              ]}
            >
              <ExpoImage systemName="magnifyingglass" size={18} color="#8E8E93" />
              <ExpoTextField
                placeholder="Search Mora"
                defaultValue={query}
                onChangeText={setQuery}
                onSubmit={goSearch}
                modifiers={[frameM({ maxWidth: 10000 })]}
              />
              <ExpoImage
                systemName="camera.fill"
                size={18}
                color={PRIMARY}
                onPress={goSearch}
              />
            </HStack>
          </Host>
        </View>

        <View style={styles.iconWrap}>
          <Host style={{ width: 46, height: 46 }}>
            <ExpoImage
              systemName="bell"
              size={20}
              color={colors.foreground}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              modifiers={[
                frameM({ width: 46, height: 46 }),
                glassEffectM({ glass: { variant: "regular", interactive: true }, shape: "circle" }),
              ]}
            />
          </Host>
          {notificationCount > 0 && <Badge count={notificationCount} />}
        </View>

        <View style={styles.iconWrap}>
          <Host style={{ width: 46, height: 46 }}>
            <ExpoImage
              systemName="heart"
              size={20}
              color={colors.foreground}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              modifiers={[
                frameM({ width: 46, height: 46 }),
                glassEffectM({ glass: { variant: "regular", interactive: true }, shape: "circle" }),
              ]}
            />
          </Host>
          {favoritesCount > 0 && <Badge count={favoritesCount} />}
        </View>
      </View>
    </View>
  );
}

function FallbackHeader({ notificationCount = 0, favoritesCount = 0, cartCount = 0 }: HomeHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
        <Pressable
          style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          onPress={() => router.push("/(tabs)/search")}
        >
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <Text style={[styles.searchPlaceholder, { color: colors.mutedForeground }]}>
            Search Mora
          </Text>
          <Feather name="camera" size={18} color={colors.foreground} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={() => router.push("/(tabs)/wishlist")}
        >
          <Feather name="heart" size={23} color={colors.foreground} />
          {favoritesCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{favoritesCount > 9 ? "9+" : favoritesCount}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={() => router.push("/(tabs)/cart")}
        >
          <Feather name="shopping-bag" size={23} color={colors.foreground} />
          {cartCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{cartCount > 9 ? "9+" : cartCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function HomeHeader(props: HomeHeaderProps) {
  const nativeReady = useNativeReady();
  if (!glassAvailable || !nativeReady) return <FallbackHeader {...props} />;
  return <GlassHeader {...props} />;
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
  searchWrap: { flex: 1 },
  iconWrap: { width: 46, height: 46, position: "relative" },
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
  badgeText: { color: "#FFFFFF", fontSize: 10, fontFamily: "Inter_700Bold" },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchPlaceholder: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  iconBtn: { padding: 8, position: "relative" },
  pressed: { opacity: 0.6 },
});
