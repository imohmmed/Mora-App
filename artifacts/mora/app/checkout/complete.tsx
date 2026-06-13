import React, { useEffect, useRef } from "react";
import {
  Animated,
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
import { useTheme } from "@/context/ThemeContext";
import { formatIQD } from "@/lib/format";

const PRIMARY = "#0274C1";

type ItemSnap = {
  title: string;
  quantity: number;
  price: number;
  image?: string;
  size?: string;
  color?: string;
};

function StepIndicator({ isDark }: { isDark: boolean }) {
  const steps = ["Cart", "Checkout", "Done"];
  const inactiveTxt = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
  return (
    <View style={si.container}>
      {steps.map((label, i) => {
        const step = i + 1;
        const done = step <= 3;
        return (
          <React.Fragment key={label}>
            <View style={si.stepWrap}>
              <View style={[si.circle, { backgroundColor: PRIMARY, borderColor: PRIMARY }]}>
                <Feather name="check" size={11} color="#fff" />
              </View>
              <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase",
                color: step === 3 ? PRIMARY : isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)", marginTop: 5 }}>
                {label}
              </Text>
            </View>
            {i < 2 && <View style={[si.line, { backgroundColor: PRIMARY }]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const si = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", paddingHorizontal: 30, marginTop: 8, marginBottom: 4 },
  stepWrap:  { alignItems: "center" },
  circle:    { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  line:      { flex: 1, height: 1.5 },
});

export default function OrderCompleteScreen() {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { orderNumber, total, name, city, district, phone, items: itemsRaw } = useLocalSearchParams<{
    orderNumber: string; total: string; name: string;
    city: string; district: string; phone: string; items: string;
  }>();

  let parsedItems: ItemSnap[] = [];
  try { parsedItems = JSON.parse(itemsRaw || "[]"); } catch {}

  const totalNum = Number(total) || 0;

  const bg       = isDark ? "#0A0A0A" : "#F2F2F7";
  const card     = isDark ? "#1C1C1E" : "#FFFFFF";
  const textCol  = isDark ? "#FFFFFF" : "#1A1A1A";
  const sub      = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)";
  const divColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, damping: 12, stiffness: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[s.root, { backgroundColor: bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 6 }]}>
        <Text style={[s.headTitle, { color: textCol }]}>Order Confirmed</Text>
      </View>

      <StepIndicator isDark={isDark} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>

        <View style={s.heroWrap}>
          <Animated.View style={[s.heroCircle, { transform: [{ scale: scaleAnim }] }]}>
            <Feather name="check" size={40} color="#fff" />
          </Animated.View>
          <Animated.View style={{ opacity: fadeAnim, alignItems: "center", gap: 6 }}>
            <Text style={[s.heroTitle, { color: textCol }]}>Order Placed!</Text>
            <View style={s.orderNumBadge}>
              <Text style={s.orderNum}>{orderNumber}</Text>
            </View>
            <Text style={[s.heroSub, { color: sub }]}>
              Thank you{name ? `, ${name.split(" ")[0]}` : ""}! We'll prepare your order right away.
            </Text>
          </Animated.View>
        </View>

        <Text style={[s.sectionLbl, { color: sub }]}>ORDER ITEMS</Text>
        <View style={[s.card, { backgroundColor: card }]}>
          {parsedItems.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <View style={[s.divider, { backgroundColor: divColor }]} />}
              <View style={s.itemRow}>
                {item.image && (
                  <Image source={{ uri: item.image }} style={s.itemImg} contentFit="cover" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[s.itemTitle, { color: textCol }]} numberOfLines={1}>{item.title}</Text>
                  {(item.size || item.color) && (
                    <Text style={[s.itemSub, { color: sub }]}>{[item.size, item.color].filter(Boolean).join(" · ")}</Text>
                  )}
                </View>
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Text style={[s.itemQty, { color: sub }]}>×{item.quantity}</Text>
                  <Text style={[s.itemPrice, { color: textCol }]}>{formatIQD(item.price * item.quantity)}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
          <View style={[s.divider, { backgroundColor: divColor }]} />
          <View style={s.rowSpc}>
            <Text style={[s.rowLbl, { color: sub }]}>Shipping</Text>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#22C55E" }}>Free</Text>
          </View>
          <View style={s.rowSpc}>
            <Text style={[s.rowLbl, { color: textCol, fontWeight: "700" }]}>Total</Text>
            <Text style={[s.rowVal, { color: PRIMARY }]}>{formatIQD(totalNum)}</Text>
          </View>
        </View>

        <Text style={[s.sectionLbl, { color: sub }]}>DELIVERY DETAILS</Text>
        <View style={[s.card, { backgroundColor: card }]}>
          <View style={s.detailRow}>
            <Feather name="map-pin" size={16} color={PRIMARY} />
            <View style={{ flex: 1 }}>
              <Text style={[s.detailTitle, { color: textCol }]}>Delivery Address</Text>
              <Text style={[s.detailSub, { color: sub }]}>{[district, city].filter(Boolean).join(", ") || "—"}</Text>
            </View>
          </View>
          <View style={[s.divider, { backgroundColor: divColor }]} />
          <View style={s.detailRow}>
            <Feather name="phone" size={16} color={PRIMARY} />
            <View style={{ flex: 1 }}>
              <Text style={[s.detailTitle, { color: textCol }]}>Phone</Text>
              <Text style={[s.detailSub, { color: sub }]}>{phone || "—"}</Text>
            </View>
          </View>
          <View style={[s.divider, { backgroundColor: divColor }]} />
          <View style={s.detailRow}>
            <Feather name="dollar-sign" size={16} color={PRIMARY} />
            <View style={{ flex: 1 }}>
              <Text style={[s.detailTitle, { color: textCol }]}>Payment Method</Text>
              <Text style={[s.detailSub, { color: sub }]}>Cash on Delivery</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      <View style={[s.footer, { backgroundColor: bg, paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          onPress={() => router.replace("/(tabs)" as any)}
          style={({ pressed }) => [s.contBtn, pressed && { opacity: 0.82 }]}
        >
          <Text style={s.contTxt}>CONTINUE SHOPPING</Text>
          <Feather name="arrow-right" size={15} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  header:      { paddingHorizontal: 20, paddingBottom: 8, alignItems: "center" },
  headTitle:   { fontSize: 17, fontWeight: "700" },
  heroWrap:    { alignItems: "center", paddingVertical: 28, paddingHorizontal: 24, gap: 16 },
  heroCircle:  { width: 80, height: 80, borderRadius: 40, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center", marginBottom: 4, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  heroTitle:   { fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  orderNumBadge: { backgroundColor: PRIMARY, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 5 },
  orderNum:    { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  heroSub:     { fontSize: 14, textAlign: "center", lineHeight: 20 },
  sectionLbl:  { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 18, marginBottom: 8, marginHorizontal: 20 },
  card:        { marginHorizontal: 16, borderRadius: 16, overflow: "hidden" },
  itemRow:     { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  itemImg:     { width: 44, height: 52, borderRadius: 8 },
  itemTitle:   { fontSize: 13, fontWeight: "600" },
  itemSub:     { fontSize: 11, marginTop: 2 },
  itemQty:     { fontSize: 11, fontWeight: "600" },
  itemPrice:   { fontSize: 13, fontWeight: "700" },
  divider:     { height: 1, marginHorizontal: 16 },
  rowSpc:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 },
  rowLbl:      { fontSize: 14, fontWeight: "500" },
  rowVal:      { fontSize: 16, fontWeight: "800" },
  detailRow:   { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  detailTitle: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  detailSub:   { fontSize: 12 },
  footer:      { paddingHorizontal: 16, paddingTop: 12 },
  contBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#111", height: 54, borderRadius: 50 },
  contTxt:     { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.8 },
});
