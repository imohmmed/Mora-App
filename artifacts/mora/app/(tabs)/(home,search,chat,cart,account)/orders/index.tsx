import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { fetchOrders } from "@/lib/api";
import { GlassBackButton } from "@/components/GlassBackButton";

const PRIMARY = "#0274C1";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return iso; }
}
function statusColor(s: string) {
  const l = s.toLowerCase();
  if (l === "delivered" || l === "fulfilled") return "#43A047";
  if (l === "shipped" || l === "in_transit") return "#0274C1";
  if (l === "cancelled" || l === "refunded") return "#E53935";
  return "#888";
}

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const card = isDark ? "#1C1C1E" : "#EBF5FF";
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const botPad = Platform.OS === "web" ? 0 : insets.bottom;

  const { data: orders, isLoading: ordersLoading, isRefetching, refetch } = useQuery({
    queryKey: ["orders", user?.email],
    queryFn: () => fetchOrders(user?.email ?? ""),
    enabled: !!user?.email,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.acctHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <GlassBackButton onPress={() => router.back()} />
        <Text style={[styles.acctTitle, { color: colors.foreground }]}>MY ORDERS</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: botPad + 80, gap: 10 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PRIMARY} />}
      >
        {ordersLoading ? (
          <View style={styles.centeredBox}>
            <ActivityIndicator color={PRIMARY} size="large" />
          </View>
        ) : !orders || orders.length === 0 ? (
          <View style={styles.centeredBox}>
            <Feather name="package" size={48} color={colors.border} />
            <Text style={[styles.centeredText, { color: colors.mutedForeground }]}>No orders yet</Text>
          </View>
        ) : (
          orders.map((order) => (
            <Pressable
              key={order.id}
              style={({ pressed }) => [styles.orderCard, { backgroundColor: card, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => router.push({ pathname: "/orders/[id]", params: { id: order.id, email: user?.email ?? "" } } as any)}
            >
              <View style={styles.orderCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.orderNum, { color: colors.foreground }]}>
                    Order #{order.orderNumber ?? order.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>{formatDate(order.createdAt)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(order.status) + "20" }]}>
                  <Text style={[styles.statusTxt, { color: statusColor(order.status) }]}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Text>
                </View>
                <Feather name="chevron-right" size={14} color={colors.mutedForeground} style={{ marginLeft: 6 }} />
              </View>
              <View style={[styles.orderCardBottom, { borderTopColor: colors.border }]}>
                <Text style={[styles.orderItems, { color: colors.mutedForeground }]}>
                  {order.lineItems?.length ?? 0} item{(order.lineItems?.length ?? 0) !== 1 ? "s" : ""}
                </Text>
                <Text style={[styles.orderTotal, { color: colors.foreground }]}>{Math.round(order.total).toLocaleString("en-US")} IQD</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  acctHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  acctTitle: { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 1 },
  orderCard: { borderRadius: 16, overflow: "hidden" },
  orderCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  orderNum: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  orderDate: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  statusTxt: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  orderCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  orderItems: { fontFamily: "Inter_400Regular", fontSize: 13 },
  orderTotal: { fontFamily: "Inter_700Bold", fontSize: 14 },
  centeredBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  centeredText: { fontFamily: "Inter_400Regular", fontSize: 15 },
});
