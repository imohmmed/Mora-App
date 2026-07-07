import React from "react";
import { Image as RNImage, Pressable, StyleSheet, Text, View } from "react-native";

const LOGO = require("@/assets/images/mora-wordmark.png");
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useNativeReady } from "@/hooks/useNativeReady";

const PRIMARY = "#0274C1";

let glassAvailable = false;
let Host: any, ExpoImage: any;
let frameM: any, glassEffectM: any;
try {
  const ui = require("@expo/ui/swift-ui");
  const mods = require("@expo/ui/swift-ui/modifiers");
  Host = ui.Host;
  ExpoImage = ui.Image;
  frameM = mods.frame;
  glassEffectM = mods.glassEffect;
  glassAvailable = !!(Host && ExpoImage);
} catch {}

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

function GlassHeader({ notificationCount = 0, favoritesCount = 0, transparent = false }: HomeHeaderProps) {
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

        <View style={styles.iconWrap}>
          <Host style={{ width: 46, height: 46 }}>
            <ExpoImage
              systemName="bell"
              size={20}
              color={iconColor}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/notifications" as any);
              }}
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
              color={iconColor}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/wishlist" as any);
              }}
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

function FallbackHeader({ notificationCount = 0, favoritesCount = 0, transparent = false }: HomeHeaderProps) {
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

        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={() => router.push("/notifications" as any)}
        >
          <Feather name="bell" size={23} color={iconColor} />
          {notificationCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{notificationCount > 9 ? "9+" : notificationCount}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          onPress={() => router.push("/wishlist" as any)}
        >
          <Feather name="heart" size={23} color={iconColor} />
          {favoritesCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{favoritesCount > 9 ? "9+" : favoritesCount}</Text>
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
  iconBtn: { padding: 8, position: "relative" },
  pressed: { opacity: 0.6 },
});
