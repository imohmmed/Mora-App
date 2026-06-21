import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { GlassBackButton } from "@/components/GlassBackButton";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { useAuth } from "@/context/AuthContext";

function getBaseUrl() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}/api` : "/api";
}

type InAppNotification = {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  url: string;
  read: boolean;
  createdAt: string;
};

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  return `منذ ${days} يوم`;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 0 : insets.top;
  const auth = useAuth();
  const queryClient = useQueryClient();
  const token = auth?.token ?? null;

  const { data: notifications = [], isLoading } = useQuery<InAppNotification[]>({
    queryKey: ["notifications", token],
    queryFn: async () => {
      if (!token) return [];
      const res = await fetch(`${getBaseUrl()}/store/notifications`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!res.ok) return [];
      const json = await res.json() as { data: InAppNotification[] };
      return json.data ?? [];
    },
    enabled: !!token,
    staleTime: 30000,
  });

  // Mark all as read when screen opens
  useEffect(() => {
    if (!token || notifications.length === 0) return;
    const hasUnread = notifications.some((n) => !n.read);
    if (!hasUnread) return;
    fetch(`${getBaseUrl()}/store/notifications/read-all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread", token] });
    }).catch(() => {});
  }, [notifications, token, queryClient]);

  function handleNotifPress(notif: InAppNotification) {
    if (!notif.url) return;
    try {
      router.push(notif.url as any);
    } catch {}
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <GlassBackButton onPress={() => router.back()} />
        <Text style={[styles.title, { color: colors.foreground }]}>الإشعارات</Text>
        <View style={styles.spacer} />
      </View>

      <FloatingTabBar />

      {!token ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIconBg, { backgroundColor: colors.secondary }]}>
            <Feather name="bell-off" size={48} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>سجّل دخولك</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            لمشاهدة إشعاراتك سجّل دخولك أولاً
          </Text>
          <Pressable
            style={[styles.loginBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/auth" as any)}
          >
            <Text style={styles.loginBtnText}>تسجيل الدخول</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <View style={styles.emptyWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIconBg, { backgroundColor: colors.secondary }]}>
            <Feather name="bell" size={48} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>لا توجد إشعارات</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            ستظهر هنا طلباتك وعروضك
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {notifications.map((notif) => (
            <Pressable
              key={notif.id}
              style={({ pressed }) => [
                styles.notifCard,
                { backgroundColor: notif.read ? colors.background : colors.secondary },
                { borderColor: colors.border },
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => handleNotifPress(notif)}
              disabled={!notif.url}
            >
              {/* Unread dot */}
              {!notif.read && (
                <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
              )}

              {/* Icon */}
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + "1A" }]}>
                <Feather name="bell" size={20} color={colors.primary} />
              </View>

              {/* Content */}
              <View style={styles.notifContent}>
                <Text style={[styles.notifTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {notif.title}
                </Text>
                <Text style={[styles.notifBody, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {notif.body}
                </Text>
                <View style={styles.notifMeta}>
                  <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
                    {timeAgo(notif.createdAt)}
                  </Text>
                  {notif.url ? (
                    <View style={styles.linkChip}>
                      <Feather name="arrow-right" size={11} color={colors.primary} />
                      <Text style={[styles.linkChipText, { color: colors.primary }]}>عرض</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
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
  title: { fontFamily: "Inter_700Bold", fontSize: 18, flex: 1, textAlign: "center" },
  spacer: { width: 30 },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
    paddingBottom: 80,
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
  },
  loginBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  loginBtnText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 14,
    left: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginLeft: 8,
  },
  notifContent: { flex: 1 },
  notifTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    marginBottom: 3,
  },
  notifBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  notifMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notifTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  linkChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "rgba(2,116,193,0.10)",
  },
  linkChipText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
});
