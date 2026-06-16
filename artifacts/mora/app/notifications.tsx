import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb  = Platform.OS === "web";
  const topPad = isWeb ? 0 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.emptyWrap}>
        <View style={[styles.emptyIconBg, { backgroundColor: colors.secondary }]}>
          <Feather name="bell" size={48} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          No notifications yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
          You'll see order updates and offers here
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, flex: 1, textAlign: "center" },
  spacer: { width: 30 },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 22, textAlign: "center" },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    color: "gray",
  },
});
