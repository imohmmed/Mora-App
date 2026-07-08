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
import { useLanguage } from "@/context/LanguageContext";
import { fetchOrders } from "@/lib/api";
import { GlassBackButton } from "@/components/GlassBackButton";
import { formatIQD } from "@/lib/format";

const PRIMARY = "#0274C1";

function formatDate(iso: string, isAr: boolean) {
  try {
    return new Date(iso).toLocaleDateString(isAr ? "ar-IQ" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return iso; }
}

function statusColor(s: string) {
  const l = s.toLowerCase();
  if (l === "delivered" || l === "fulfilled") return "#43A047";
  if (l === "shipped" || l === "in_transit" || l === "shipping" || l === "preparing") return PRIMARY;
  if (l === "cancelled" || l === "refunded") return "#E53935";
  if (l === "delivered") return "#43A047";
  return "#888";
}

function stageLabel(stage: string | undefined, status: string, isAr: boolean) {
  const map: Record<string, { ar: string; en: string }> = {
    confirmed:  { ar: "تم التثبيت",     en: "Confirmed" },
    preparing:  { ar: "يتم التجهيز",    en: "Preparing" },
    shipping:   { ar: "يتم الشحن",      en: "Shipping" },
    delivered:  { ar: "تم التوصيل",     en: "Delivered" },
    issue:      { ar: "مشكلة",          en: "Issue" },
    cancelled:  { ar: "ملغى",           en: "Cancelled" },
    pending:    { ar: "قيد الانتظار",   en: "Pending" },
    processing: { ar: "يجري التجهيز",   en: "Processing" },
    completed:  { ar: "مكتمل",          en: "Completed" },
  };
  const key = stage || status;
  const entry = map[key];
  if (!entry) return key;
  return isAr ? entry.ar : entry.en;
}

function StarDisplay({ rating, size }: { rating: number; size?: number }) {
  const s = size ?? 14;
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Feather key={i} name="star" size={s} color={i <= rating ? "#F59E0B" : "rgba(128,128,128,0.2)"} />
      ))}
    </View>
  );
}

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const card = isDark ? "#1C1C1E" : "#EBF5FF";
  const sub  = isDark ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.40)";
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
        {Platform.OS === "web" ? (
          <>
            <Pressable style={styles.flatIconBtn} onPress={() => router.back()}>
              <Feather name={isAr ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.pageTitleWeb, { color: colors.foreground }, isAr && { textAlign: "right" }]}>
              {isAr ? "طلباتي" : "MY ORDERS"}
            </Text>
            <View style={{ width: 38 }} />
          </>
        ) : (
          <>
            <GlassBackButton onPress={() => router.back()} />
            <Text style={[styles.acctTitle, { color: colors.foreground }]}>
              {isAr ? "طلباتي" : "MY ORDERS"}
            </Text>
            <View style={{ width: 38 }} />
          </>
        )}
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
            <Text style={[styles.centeredText, { color: colors.mutedForeground }]}>
              {isAr ? "لا توجد طلبات بعد" : "No orders yet"}
            </Text>
          </View>
        ) : (
          orders.map((order) => {
            const deliveryStage = (order as any).deliveryStage as string | undefined;
            const reviewRating  = (order as any).reviewRating as number | undefined;
            const isDelivered   = deliveryStage === "delivered";
            const hasReview     = !!reviewRating && reviewRating > 0;
            const showRateBtn   = isDelivered && !hasReview;
            const colKey        = deliveryStage || order.status;
            const col           = statusColor(colKey);

            return (
              <Pressable
                key={order.id}
                style={({ pressed }) => [styles.orderCard, { backgroundColor: card, opacity: pressed ? 0.85 : 1 }, Platform.OS === "web" && { borderRadius: 0, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: "transparent" }]}
                onPress={() => router.push({ pathname: "/orders/[id]", params: { id: order.id, email: user?.email ?? "" } } as any)}
              >
                {/* Top row */}
                <View style={[styles.orderCardTop, { flexDirection: isAr ? "row-reverse" : "row" }]}>
                  <View style={{ flex: 1, alignItems: isAr ? "flex-end" : "flex-start" }}>
                    <Text style={[styles.orderNum, { color: colors.foreground }]}>
                      {isAr ? `طلب ${order.orderNumber ?? order.id.slice(0, 8).toUpperCase()}` : `Order ${order.orderNumber ?? order.id.slice(0, 8).toUpperCase()}`}
                    </Text>
                    <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>{formatDate(order.createdAt, isAr)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: col + "20" }]}>
                    <Text style={[styles.statusTxt, { color: col }]}>
                      {stageLabel(deliveryStage, order.status, isAr)}
                    </Text>
                  </View>
                  <Feather
                    name={isAr ? "chevron-left" : "chevron-right"}
                    size={14}
                    color={colors.mutedForeground}
                    style={{ marginStart: 6 }}
                  />
                </View>

                {/* Bottom row */}
                <View style={[styles.orderCardBottom, { borderTopColor: colors.border, flexDirection: isAr ? "row-reverse" : "row" }]}>
                  <Text style={[styles.orderItems, { color: colors.mutedForeground }]}>
                    {isAr
                      ? `${order.lineItems?.length ?? 0} صنف`
                      : `${order.lineItems?.length ?? 0} item${(order.lineItems?.length ?? 0) !== 1 ? "s" : ""}`
                    }
                  </Text>
                  <Text style={[styles.orderTotal, { color: colors.foreground }]}>{formatIQD(order.total)}</Text>
                </View>

                {/* Review row — stars if reviewed, "أعطينا رأيك" if delivered+unreviewed */}
                {(hasReview || showRateBtn) && (
                  <View style={[styles.reviewRow, { borderTopColor: colors.border, flexDirection: isAr ? "row-reverse" : "row" }]}>
                    {hasReview ? (
                      <>
                        <StarDisplay rating={reviewRating!} />
                        <Text style={[styles.reviewedTxt, { color: sub }]}>
                          {isAr ? "قيّمت هذا الطلب" : "You reviewed this order"}
                        </Text>
                      </>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [styles.rateBtn, { opacity: pressed ? 0.75 : 1 }]}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          router.push({ pathname: "/orders/[id]", params: { id: order.id, email: user?.email ?? "" } } as any);
                        }}
                      >
                        <Feather name="star" size={13} color="#F59E0B" />
                        <Text style={styles.rateBtnTxt}>
                          {isAr ? "أعطينا رأيك" : "Leave a review"}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  acctHeader:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  acctTitle:       { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 1 },
  pageTitleWeb:    { fontFamily: "Inter_900Black", fontSize: 22, fontWeight: "900", letterSpacing: -0.4, flex: 1, paddingHorizontal: 8 },
  flatIconBtn:     { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  orderCard:       { borderRadius: 16, overflow: "hidden" },
  orderCardTop:    { alignItems: "center", justifyContent: "space-between", padding: 14 },
  orderNum:        { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  orderDate:       { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  statusBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  statusTxt:       { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  orderCardBottom: { alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, justifyContent: "space-between" },
  orderItems:      { fontFamily: "Inter_400Regular", fontSize: 13 },
  orderTotal:      { fontFamily: "Inter_700Bold", fontSize: 14 },
  reviewRow:       { alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, gap: 8 },
  reviewedTxt:     { fontSize: 12 },
  rateBtn:         { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, backgroundColor: "rgba(245,158,11,0.12)" },
  rateBtnTxt:      { fontSize: 12, fontWeight: "600", color: "#F59E0B" },
  centeredBox:     { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  centeredText:    { fontFamily: "Inter_400Regular", fontSize: 15 },
});
