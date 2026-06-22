import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { fetchOrder } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import { GlassBackButton } from "@/components/GlassBackButton";
import { LiquidGlassBg, isIOS26Plus } from "@/components/LiquidGlassBg";

const PRIMARY = "#0274C1";

type FullAddress = {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  district?: string;
  street?: string;
  country?: string;
};

function statusColor(status: string) {
  if (status === "completed") return "#22C55E";
  if (status === "processing") return PRIMARY;
  if (status === "cancelled") return "#EF4444";
  return "#F59E0B";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: "Pending",
    processing: "Processing",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return map[status] ?? status;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function SectionLabel({ text, sub }: { text: string; sub: string }) {
  return (
    <Text style={[st.sectionLbl, { color: sub }]}>{text}</Text>
  );
}

function InfoRow({ label, value, textCol, sub }: { label: string; value: string; textCol: string; sub: string }) {
  return (
    <View style={st.infoRow}>
      <Text style={[st.infoLbl, { color: sub }]}>{label}</Text>
      <Text style={[st.infoVal, { color: textCol }]}>{value}</Text>
    </View>
  );
}

export default function OrderDetailScreen() {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const { id, email: emailParam } = useLocalSearchParams<{ id: string; email: string }>();
  const email = emailParam || user?.email || "";

  const bg      = isDark ? "#0A0A0A" : "#FFFFFF";
  const card    = isDark ? "#1C1C1E" : "#EBF5FF";
  const textCol = isDark ? "#FFFFFF" : "#1A1A1A";
  const sub     = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)";
  const divClr  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", id, email],
    queryFn: () => fetchOrder(id!, email),
    enabled: !!id && !!email,
  });

  const addr = (order?.shippingAddress ?? {}) as FullAddress;
  const displayName = addr.fullName || [addr.firstName, addr.lastName].filter(Boolean).join(" ") || "—";

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <View style={[st.header, { paddingTop: insets.top + 6, paddingHorizontal: 16 }]}>
          <GlassBackButton onPress={() => router.back()} />
          <Text style={[st.headTitle, { color: textCol }]}>Order Detail</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Feather name="package" size={48} color={divClr} />
          <Text style={{ color: sub, fontSize: 15 }}>Order not found</Text>
        </View>
      </View>
    );
  }

  const col = statusColor(order.status);
  const items = order.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      <View style={[st.header, { paddingTop: insets.top + 6, paddingHorizontal: 16 }]}>
        <GlassBackButton onPress={() => router.back()} />
        <Text style={[st.headTitle, { color: textCol }]}>
          {order.orderNumber ? `Order ${order.orderNumber}` : "Order Detail"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Status card */}
        <View style={[st.statusCard, { backgroundColor: col + (isDark ? "18" : "12"), borderColor: col + "40" }]}>
          <View style={[st.statusDot, { backgroundColor: col }]} />
          <View style={{ flex: 1 }}>
            <Text style={[st.statusLabel, { color: col }]}>{statusLabel(order.status)}</Text>
            <Text style={[st.statusDate, { color: sub }]}>{formatDate(order.createdAt)}</Text>
          </View>
          <Text style={[st.statusTotal, { color: textCol }]}>{formatIQD(order.total)}</Text>
        </View>

        {/* Items */}
        <SectionLabel text="ITEMS" sub={sub} />
        <View style={[st.group, { backgroundColor: card }]}>
          {items.map((item, idx) => (
            <View key={item.id ?? idx}>
              {idx > 0 && <View style={[st.divider, { backgroundColor: divClr }]} />}
              <View style={st.itemRow}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={st.itemImg} contentFit="cover" />
                ) : (
                  <View style={[st.itemImg, { backgroundColor: divClr }]}>
                    <Feather name="image" size={18} color={sub} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[st.itemTitle, { color: textCol }]} numberOfLines={2}>{item.title}</Text>
                  {item.variantTitle && item.variantTitle !== "Default Title" && (
                    <Text style={[st.itemVariant, { color: sub }]}>{item.variantTitle}</Text>
                  )}
                  <Text style={[st.itemQty, { color: sub }]}>Qty: {item.quantity}</Text>
                </View>
                <Text style={[st.itemPrice, { color: textCol }]}>{formatIQD(item.price * item.quantity)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Delivery info */}
        {(displayName !== "—" || addr.city) && (
          <>
            <SectionLabel text="DELIVERY INFO" sub={sub} />
            <View style={[st.group, { backgroundColor: card }]}>
              {displayName !== "—" && <InfoRow label="Name" value={displayName} textCol={textCol} sub={sub} />}
              {addr.phone && (
                <>
                  <View style={[st.divider, { backgroundColor: divClr }]} />
                  <InfoRow label="Phone" value={addr.phone} textCol={textCol} sub={sub} />
                </>
              )}
              {addr.city && (
                <>
                  <View style={[st.divider, { backgroundColor: divClr }]} />
                  <InfoRow
                    label="Address"
                    value={[addr.city, addr.district, addr.street].filter(Boolean).join(", ")}
                    textCol={textCol} sub={sub}
                  />
                </>
              )}
            </View>
          </>
        )}

        {/* Payment summary */}
        <SectionLabel text="ORDER SUMMARY" sub={sub} />
        <View style={[st.group, { backgroundColor: card }]}>
          <View style={st.summaryRow}>
            <Text style={[st.summaryLbl, { color: sub }]}>Subtotal</Text>
            <Text style={[st.summaryVal, { color: textCol }]}>{formatIQD(order.subtotal ?? order.total)}</Text>
          </View>
          <View style={[st.divider, { backgroundColor: divClr }]} />
          <View style={st.summaryRow}>
            <Text style={[st.summaryLbl, { color: sub }]}>Shipping</Text>
            <Text style={[{ fontSize: 13, fontWeight: "600" }, { color: "#22C55E" }]}>Free</Text>
          </View>
          <View style={[st.divider, { backgroundColor: divClr }]} />
          <View style={st.summaryRow}>
            <Text style={[st.summaryLbl, { color: textCol, fontWeight: "700" }]}>Total</Text>
            <Text style={[st.summaryTotal, { color: PRIMARY }]}>{formatIQD(order.total)}</Text>
          </View>
        </View>

        {/* Shop again */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <Pressable
            style={({ pressed }) => [st.shopBtn, { backgroundColor: PRIMARY, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push("/(tabs)" as any)}
          >
            <Feather name="shopping-bag" size={16} color="#fff" />
            <Text style={st.shopBtnTxt}>SHOP AGAIN</Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  header:      { flexDirection: "row", alignItems: "center", paddingBottom: 8 },
  headTitle:   { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" },
  statusCard:  { margin: 16, borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  statusDot:   { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 14, fontWeight: "700", letterSpacing: 0.4 },
  statusDate:  { fontSize: 11, marginTop: 3 },
  statusTotal: { fontSize: 16, fontWeight: "800" },
  sectionLbl:  { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 20, marginBottom: 8, marginHorizontal: 20 },
  group:       { marginHorizontal: 16, borderRadius: 16, overflow: "hidden" },
  divider:     { height: 1, marginHorizontal: 16 },
  itemRow:     { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  itemImg:     { width: 52, height: 64, borderRadius: 10, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  itemTitle:   { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  itemVariant: { fontSize: 11 },
  itemQty:     { fontSize: 11 },
  itemPrice:   { fontSize: 13, fontWeight: "700", minWidth: 90, textAlign: "right" },
  infoRow:     { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  infoLbl:     { fontSize: 12, fontWeight: "500", width: 70, flexShrink: 0 },
  infoVal:     { flex: 1, fontSize: 13, fontWeight: "500" },
  summaryRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  summaryLbl:  { fontSize: 13, fontWeight: "500" },
  summaryVal:  { fontSize: 13, fontWeight: "600" },
  summaryTotal:{ fontSize: 16, fontWeight: "800" },
  shopBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 52, borderRadius: 50 },
  shopBtnTxt:  { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 0.8 },
});
