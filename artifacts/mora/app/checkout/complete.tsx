import React, { useEffect, useRef, useState } from "react";
import { LiquidGlassBg, isIOS26Plus } from "@/components/LiquidGlassBg";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { formatIQD } from "@/lib/format";

const PRIMARY   = "#0274C1";
const WAYL_BLUE = "#3B82F6";

function getBaseUrl() {
  const d = process.env.EXPO_PUBLIC_DOMAIN;
  return d ? `https://${d}/api` : "/api";
}

type PayStatus = "pending" | "paid" | "failed";
type ItemSnap = { title: string; quantity: number; price: number; image?: string; size?: string; color?: string };

function StepIndicator({ isDark }: { isDark: boolean }) {
  const steps = ["Cart", "Checkout", "Done"];
  return (
    <View style={si.container}>
      {steps.map((label, i) => {
        const step = i + 1;
        return (
          <React.Fragment key={label}>
            <View style={si.stepWrap}>
              <View style={[si.circle, { backgroundColor: PRIMARY, borderColor: PRIMARY }]}>
                <Feather name="check" size={11} color="#fff" />
              </View>
              <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase",
                color: step === 3 ? PRIMARY : isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)", marginTop: 5 }}>
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

  const params = useLocalSearchParams<{ orderNumber: string; total: string; name: string; city: string; district: string; phone: string; items: string; paymentMethod?: string; waylUrl?: string; fromWayl?: string }>();

  // Web: load snapshot from sessionStorage when returning from Wayl
  const [snapData, setSnapData] = useState<{ orderNumber: string; total: string; name: string; city: string; district: string; phone: string; snapshot: string } | null>(null);

  const orderNumber = params.orderNumber || snapData?.orderNumber || "";
  const total       = params.total       || snapData?.total       || "0";
  const name        = params.name        || snapData?.name        || "";
  const city        = params.city        || snapData?.city        || "";
  const district    = params.district    || snapData?.district    || "";
  const phone       = params.phone       || snapData?.phone       || "";
  const itemsRaw    = params.items       || snapData?.snapshot    || "[]";
  const paymentMethod = params.paymentMethod ?? (snapData ? "online" : undefined);
  const waylUrl     = params.waylUrl;

  const isCOD    = !paymentMethod || paymentMethod === "cod";
  const isOnline = !isCOD;
  const isWayl   = isOnline;

  let parsedItems: ItemSnap[] = [];
  try { parsedItems = JSON.parse(itemsRaw || "[]"); } catch {}
  const totalNum = Number(total) || 0;

  const [payStatus, setPayStatus] = useState<PayStatus>(isCOD ? "paid" : "pending");
  const [openingPayment, setOpeningPayment] = useState(false);

  const payMethodLabel: Record<string, string> = {
    card: "Mastercard / Visa", zaincash: "ZainCash", fastpay: "FastPay",
    fib: "FIB", qicard: "QiCard", nasswallet: "Nass Wallet",
    asiapay: "AsiaPay", alsaqi: "Al Saqi",
  };

  const openWayl = async () => {
    if (!waylUrl) return;
    setOpeningPayment(true);
    try {
      if (Platform.OS === "web") {
        (window as Window & typeof globalThis).location.href = waylUrl;
      } else {
        await WebBrowser.openBrowserAsync(waylUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });
      }
    } finally {
      setOpeningPayment(false);
    }
  };
  const [verifying, setVerifying] = useState(false);

  const bg      = isDark ? "#0A0A0A" : "#F2F2F7";
  const card    = isDark ? "#1C1C1E" : "#FFFFFF";
  const textCol = isDark ? "#FFFFFF" : "#1A1A1A";
  const sub     = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)";
  const divClr  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Web: load snapshot from sessionStorage when returning from Wayl redirect
  useEffect(() => {
    if (Platform.OS === "web" && params.fromWayl === "1" && typeof sessionStorage !== "undefined") {
      const stored = sessionStorage.getItem("mora_wayl_snap");
      if (stored) {
        try {
          const data = JSON.parse(stored) as { orderNumber: string; total: number; name: string; city: string; district: string; phone: string; snapshot: string };
          setSnapData({ orderNumber: data.orderNumber, total: String(data.total), name: data.name, city: data.city, district: data.district, phone: data.phone, snapshot: data.snapshot });
          sessionStorage.removeItem("mora_wayl_snap");
          setTimeout(() => verifyPayment(data.orderNumber), 2000);
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, damping: 12, stiffness: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    if (isWayl && payStatus === "pending") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }
  }, []);

  const verifyPayment = async (forceOrderNumber?: string) => {
    const num = forceOrderNumber || orderNumber;
    if (!num) return;
    setVerifying(true);
    try {
      const res = await fetch(`${getBaseUrl()}/store/wayl/status/${num}`);
      const json = await res.json() as { data: { status: string; paid: boolean } | null };
      if (json.data?.paid || json.data?.status === "completed") {
        setPayStatus("paid");
      } else if (json.data?.status === "failed" || json.data?.status === "expired") {
        setPayStatus("failed");
      }
    } catch { /* ignore */ }
    setVerifying(false);
  };

  // Auto-confirm online (Wayl) payment without manual tapping. The webhook marks
  // the order paid server-side; we poll a few times so the screen reflects it fast.
  useEffect(() => {
    if (!isWayl || payStatus !== "pending" || !orderNumber) return;
    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!active) return;
      attempts += 1;
      await verifyPayment();
      if (active && attempts < 8) timer = setTimeout(tick, 3000);
    };
    timer = setTimeout(tick, 1500);
    return () => { active = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber, payStatus, isWayl]);

  const heroColor  = payStatus === "paid" ? PRIMARY : payStatus === "failed" ? "#EF4444" : WAYL_BLUE;
  const heroIcon   = payStatus === "paid" ? "check" : payStatus === "failed" ? "x" : "clock";
  const heroTitle  = payStatus === "paid" ? (isCOD ? "Order Placed!" : "Payment Confirmed!") : payStatus === "failed" ? "Payment Failed" : "Awaiting Payment";
  const heroSubtitle = payStatus === "paid"
    ? `Thank you${name ? `, ${name.split(" ")[0]}` : ""}! Your order is being prepared.`
    : payStatus === "failed"
    ? "Your payment was not completed. Please try again."
    : "Complete your payment in the browser, then tap Verify below.";

  return (
    <View style={[s.root, { backgroundColor: bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 6 }]}>
        <Text style={[s.headTitle, { color: textCol }]}>Order Confirmed</Text>
      </View>
      <StepIndicator isDark={isDark} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>

        {/* Hero */}
        <View style={s.heroWrap}>
          <Animated.View style={[s.heroCircle, { backgroundColor: heroColor, shadowColor: heroColor, transform: [{ scale: isWayl && payStatus === "pending" ? pulseAnim : scaleAnim }] }]}>
            <Feather name={heroIcon as any} size={38} color="#fff" />
          </Animated.View>
          <Animated.View style={{ opacity: fadeAnim, alignItems: "center", gap: 6 }}>
            <Text style={[s.heroTitle, { color: textCol }]}>{heroTitle}</Text>
            <View style={[s.orderBadge, { backgroundColor: `${heroColor}20`, borderColor: `${heroColor}40` }]}>
              <Text style={[s.orderBadgeTxt, { color: heroColor }]}>{orderNumber}</Text>
            </View>
            <Text style={[s.heroSub, { color: sub }]}>{heroSubtitle}</Text>
          </Animated.View>
        </View>

        {/* PAY NOW button — primary CTA for online payments */}
        {isOnline && payStatus === "pending" && !!waylUrl && (
          <View style={s.verifyWrap}>
            <Pressable onPress={openWayl} disabled={openingPayment}
              style={({ pressed }) => [s.payNowBtn, pressed && { opacity: 0.85 }, openingPayment && { opacity: 0.7 }]}>
              {openingPayment
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Feather name="credit-card" size={16} color="#fff" /><Text style={s.payNowTxt}>PAY NOW</Text></>
              }
            </Pressable>
          </View>
        )}

        {/* Wayl verify button */}
        {isWayl && payStatus === "pending" && (
          <View style={[s.verifyWrap, { marginTop: !!waylUrl ? 0 : undefined }]}>
            <Pressable onPress={() => verifyPayment()} disabled={verifying}
              style={({ pressed }) => [s.verifyBtn, pressed && { opacity: 0.85 }, verifying && { opacity: 0.7 }]}>
              {verifying
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Feather name="refresh-cw" size={15} color="#fff" /><Text style={s.verifyTxt}>VERIFY PAYMENT</Text></>
              }
            </Pressable>
            <Text style={[s.verifyHint, { color: sub }]}>Paid already? Tap to confirm your payment status.</Text>
          </View>
        )}

        {/* Payment method badge */}
        {isWayl && payStatus !== "pending" && (
          <View style={[s.payBadgeWrap, { backgroundColor: card }]}>
            <Feather name={payStatus === "paid" ? "check-circle" : "x-circle"} size={16} color={payStatus === "paid" ? "#22C55E" : "#EF4444"} />
            <Text style={[s.payBadgeTxt, { color: payStatus === "paid" ? "#22C55E" : "#EF4444" }]}>
              {payStatus === "paid" ? "Payment Confirmed · Wayl" : "Payment Not Completed"}
            </Text>
          </View>
        )}

        {/* Items */}
        <Text style={[s.sectionLbl, { color: sub }]}>ORDER ITEMS</Text>
        <View style={[s.card, { backgroundColor: card }]}>
          {parsedItems.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <View style={[s.divider, { backgroundColor: divClr }]} />}
              <View style={s.itemRow}>
                {item.image && <Image source={{ uri: item.image }} style={s.itemImg} contentFit="cover" />}
                <View style={{ flex: 1 }}>
                  <Text style={[s.itemTitle, { color: textCol }]} numberOfLines={1}>{item.title}</Text>
                  {(item.size || item.color) && <Text style={[s.itemSub, { color: sub }]}>{[item.size, item.color].filter(Boolean).join(" · ")}</Text>}
                </View>
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Text style={[s.itemQty, { color: sub }]}>×{item.quantity}</Text>
                  <Text style={[s.itemPrice, { color: textCol }]}>{formatIQD(item.price * item.quantity)}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
          <View style={[s.divider, { backgroundColor: divClr }]} />
          <View style={s.rowSpc}><Text style={[s.rowLbl, { color: sub }]}>Shipping</Text><Text style={{ fontSize: 13, fontWeight: "600", color: "#22C55E" }}>Free</Text></View>
          <View style={s.rowSpc}><Text style={[s.rowLbl, { color: textCol, fontWeight: "700" }]}>Total</Text><Text style={[s.rowVal, { color: PRIMARY }]}>{formatIQD(totalNum)}</Text></View>
        </View>

        {/* Delivery Details */}
        <Text style={[s.sectionLbl, { color: sub }]}>DELIVERY DETAILS</Text>
        <View style={[s.card, { backgroundColor: card }]}>
          {[
            { icon: "map-pin", label: "Address",  value: [district, city].filter(Boolean).join(", ") || "—" },
            { icon: "phone",   label: "Phone",    value: phone || "—" },
            { icon: isOnline ? "credit-card" : "dollar-sign", label: "Payment", value: isOnline ? (payMethodLabel[paymentMethod || ""] || "Online Payment") : "Cash on Delivery" },
          ].map((row, idx) => (
            <React.Fragment key={row.label}>
              {idx > 0 && <View style={[s.divider, { backgroundColor: divClr }]} />}
              <View style={s.detailRow}>
                <Feather name={row.icon as any} size={15} color={PRIMARY} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.detailTitle, { color: textCol }]}>{row.label}</Text>
                  <Text style={[s.detailSub, { color: sub }]}>{row.value}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>

      </ScrollView>

      <View style={[
        s.footer,
        {
          backgroundColor: isIOS26Plus ? "transparent" : bg,
          paddingBottom: insets.bottom + 12,
        },
      ]}>
        <LiquidGlassBg />
        <Pressable onPress={() => router.replace("/" as any)}
          style={({ pressed }) => [s.contBtn, pressed && { opacity: 0.82 }]}>
          <Text style={s.contTxt}>CONTINUE SHOPPING</Text>
          <Feather name="arrow-right" size={15} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1 },
  header:       { paddingHorizontal: 20, paddingBottom: 4, alignItems: "center" },
  headTitle:    { fontSize: 17, fontWeight: "700" },
  heroWrap:     { alignItems: "center", paddingVertical: 24, paddingHorizontal: 24, gap: 14 },
  heroCircle:   { width: 78, height: 78, borderRadius: 39, alignItems: "center", justifyContent: "center", marginBottom: 4, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10 },
  heroTitle:    { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  orderBadge:   { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1 },
  orderBadgeTxt:{ fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
  heroSub:      { fontSize: 13, textAlign: "center", lineHeight: 19, maxWidth: 280 },
  verifyWrap:   { paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  payNowBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#EB001B", height: 54, borderRadius: 50, marginBottom: 8 },
  payNowTxt:    { color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: 1 },
  verifyBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: WAYL_BLUE, height: 48, borderRadius: 50 },
  verifyTxt:    { color: "#fff", fontSize: 13, fontWeight: "700", letterSpacing: 0.8 },
  verifyHint:   { textAlign: "center", fontSize: 11 },
  payBadgeWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 4, padding: 12, borderRadius: 12 },
  payBadgeTxt:  { fontSize: 12, fontWeight: "600" },
  sectionLbl:   { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 18, marginBottom: 8, marginHorizontal: 20 },
  card:         { marginHorizontal: 16, borderRadius: 16, overflow: "hidden" },
  itemRow:      { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  itemImg:      { width: 42, height: 52, borderRadius: 8 },
  itemTitle:    { fontSize: 13, fontWeight: "600" },
  itemSub:      { fontSize: 11, marginTop: 2 },
  itemQty:      { fontSize: 11, fontWeight: "600" },
  itemPrice:    { fontSize: 13, fontWeight: "700" },
  divider:      { height: 1, marginHorizontal: 16 },
  rowSpc:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 },
  rowLbl:       { fontSize: 14, fontWeight: "500" },
  rowVal:       { fontSize: 16, fontWeight: "800" },
  detailRow:    { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  detailTitle:  { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  detailSub:    { fontSize: 12 },
  footer:       { paddingHorizontal: 16, paddingTop: 12 },
  contBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#111", height: 54, borderRadius: 50 },
  contTxt:      { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.8 },
});
