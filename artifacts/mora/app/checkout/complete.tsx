import React, { useEffect, useRef, useState } from "react";
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
import { useLanguage } from "@/context/LanguageContext";
import { SeoHead } from "@/components/SeoHead";
import { formatIQD } from "@/lib/format";
import { trackCartEvent } from "@/lib/tracking";

const WEB_TAB_BAR_OFFSET = Platform.OS === "web" ? 80 : 0;
const PRIMARY   = "#0274C1";
const WAYL_BLUE = "#3B82F6";

function getBaseUrl() {
  const d = process.env.EXPO_PUBLIC_DOMAIN;
  return d ? `https://${d}/api` : "/api";
}

type PayStatus = "pending" | "paid" | "failed";
type ItemSnap  = { title: string; quantity: number; price: number; image?: string; size?: string; color?: string };

// ─── Step Bar ─────────────────────────────────────────────────────────────────
function StepBar({ isDark }: { isDark: boolean }) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const steps = isAr ? ["السلة", "الدفع", "تم"] : ["CART", "CHECKOUT", "DONE"];
  const dimLine = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";

  return (
    <View style={[sb.row, isAr && { flexDirection: "row-reverse" }]}>
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <View style={sb.item}>
            <View style={sb.dot}>
              <Feather name="check" size={13} color={PRIMARY} />
            </View>
            <Text style={[sb.lbl, { color: i === 2 ? PRIMARY : isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)" }, i === 2 && { fontWeight: "800" }]}>
              {label}
            </Text>
          </View>
          {i < 2 && <View style={[sb.line, { backgroundColor: PRIMARY }]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const sb = StyleSheet.create({
  row:  { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, marginTop: 8, marginBottom: 8 },
  item: { alignItems: "center", gap: 4 },
  dot:  { alignItems: "center", justifyContent: "center", paddingVertical: 2 },
  lbl:  { fontSize: 9, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" },
  line: { flex: 1, height: 1.5, marginBottom: 14 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OrderCompleteScreen() {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const params = useLocalSearchParams<{
    orderNumber: string; total: string; name: string;
    city: string; district: string; phone: string;
    items: string; paymentMethod?: string; waylUrl?: string;
    fromWayl?: string; paid?: string;
  }>();

  const [snapData, setSnapData] = useState<{
    orderNumber: string; total: string; name: string;
    city: string; district: string; phone: string; snapshot: string;
  } | null>(null);

  const orderNumber   = params.orderNumber  || snapData?.orderNumber || "";
  const total         = params.total        || snapData?.total       || "0";
  const name          = params.name         || snapData?.name        || "";
  const city          = params.city         || snapData?.city        || "";
  const district      = params.district     || snapData?.district    || "";
  const phone         = params.phone        || snapData?.phone       || "";
  const itemsRaw      = params.items        || snapData?.snapshot    || "[]";
  const paymentMethod = params.paymentMethod ?? (snapData ? "online" : undefined);
  const waylUrl       = params.waylUrl;

  const isCOD    = !paymentMethod || paymentMethod === "cod";
  const isOnline = !isCOD;

  let parsedItems: ItemSnap[] = [];
  try { parsedItems = JSON.parse(itemsRaw || "[]"); } catch {}
  const totalNum = Number(total) || 0;

  const [payStatus, setPayStatus]       = useState<PayStatus>(isCOD || params.paid === "1" ? "paid" : "pending");
  const [openingPayment, setOpeningPayment] = useState(false);
  const [verifying, setVerifying]       = useState(false);

  const bg      = isDark ? "#0A0A0A" : "#FFFFFF";
  const textCol = isDark ? "#FFFFFF" : "#111111";
  const sub     = isDark ? "rgba(255,255,255,0.45)" : "#888888";
  const divider = isDark ? "#1A1A1A" : "#EBEBEB";

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
    if (isOnline && payStatus === "pending") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }
  }, []);

  // Track purchase for the web Wayl-redirect flow (native flows track before navigating here)
  const trackedPurchase = useRef(false);
  useEffect(() => {
    if (payStatus === "paid" && params.fromWayl === "1" && !trackedPurchase.current) {
      trackedPurchase.current = true;
      trackCartEvent(
        "purchased",
        totalNum,
        parsedItems.map((i) => ({ title: i.title, quantity: i.quantity, price: i.price, size: i.size, color: i.color })),
      );
    }
  }, [payStatus]);

  const verifyPayment = async (forceOrderNumber?: string) => {
    const num = forceOrderNumber || orderNumber;
    if (!num) return;
    setVerifying(true);
    try {
      const res = await fetch(`${getBaseUrl()}/store/wayl/status/${num}`);
      const json = await res.json() as { data: { status: string; paid: boolean } | null };
      if (json.data?.paid || json.data?.status === "completed") setPayStatus("paid");
      else if (json.data?.status === "failed" || json.data?.status === "expired") setPayStatus("failed");
    } catch {}
    setVerifying(false);
  };

  useEffect(() => {
    if (!isOnline || payStatus !== "pending" || !orderNumber) return;
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
  }, [orderNumber, payStatus, isOnline]);

  const openWayl = async () => {
    if (!waylUrl) return;
    setOpeningPayment(true);
    try {
      if (Platform.OS === "web") {
        (window as Window & typeof globalThis).location.href = waylUrl;
      } else {
        await WebBrowser.openBrowserAsync(waylUrl, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN });
      }
    } finally { setOpeningPayment(false); }
  };

  // Status-based content
  const heroIcon  = payStatus === "paid" ? "check" : payStatus === "failed" ? "x" : "clock";
  const heroBg    = payStatus === "paid" ? PRIMARY : payStatus === "failed" ? "#EF4444" : WAYL_BLUE;

  const heroTitle = isAr
    ? (payStatus === "paid" ? (isCOD ? "تم تثبيت الطلب!" : "تم تأكيد الدفع!") : payStatus === "failed" ? "فشل الدفع" : "بانتظار الدفع")
    : (payStatus === "paid" ? (isCOD ? "Order Placed!" : "Payment Confirmed!") : payStatus === "failed" ? "Payment Failed" : "Awaiting Payment");

  const heroSub = isAr
    ? (payStatus === "paid"
        ? `شكراً${name ? `، ${name.split(" ")[0]}` : ""}! طلبك ${orderNumber} قيد التحضير.`
        : payStatus === "failed" ? "لم يكتمل دفعك. يرجى المحاولة مجدداً."
        : "أكمل دفعك في المتصفح، ثم اضغط تحقق.")
    : (payStatus === "paid"
        ? `Thank you${name ? `, ${name.split(" ")[0]}` : ""}! Your order ${orderNumber} is being prepared.`
        : payStatus === "failed" ? "Your payment was not completed. Please try again."
        : "Complete payment in browser, then tap Verify.");

  const detailRows = [
    { icon: "map-pin" as const,      label: isAr ? "العنوان" : "Address",  value: [district, city].filter(Boolean).join(", ") || "—" },
    { icon: "phone" as const,        label: isAr ? "الهاتف"  : "Phone",    value: phone || "—" },
    { icon: (isOnline ? "credit-card" : "dollar-sign") as const,
      label: isAr ? "طريقة الدفع" : "Payment",
      value: isOnline ? (isAr ? "دفع إلكتروني · Wayl" : "Online Payment · Wayl")
                      : (isAr ? "الدفع عند الاستلام" : "Cash on Delivery") },
  ];

  return (
    <View style={[s.root, { backgroundColor: bg }]}>
      <SeoHead page="complete" noIndex />
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10, borderBottomColor: divider }]}>
        <Text style={[s.headTitle, { color: textCol }]}>
          {isAr ? "تم تأكيد الطلب" : "ORDER CONFIRMED"}
        </Text>
      </View>

      <StepBar isDark={isDark} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 110 + WEB_TAB_BAR_OFFSET }}>

        {/* Hero */}
        <View style={s.heroWrap}>
          <Animated.View style={[
            s.heroCircle,
            { backgroundColor: heroBg },
            { transform: [{ scale: isOnline && payStatus === "pending" ? pulseAnim : scaleAnim }] },
          ]}>
            <Feather name={heroIcon} size={36} color="#fff" />
          </Animated.View>
          <Animated.View style={[{ opacity: fadeAnim, alignItems: "center", gap: 6, width: "100%" }]}>
            <Text style={[s.heroTitle, { color: textCol }]}>{heroTitle}</Text>
            <View style={[s.orderBadge, { borderColor: heroBg + "60" }]}>
              <Text style={[s.orderBadgeTxt, { color: heroBg }]}>{orderNumber}</Text>
            </View>
            <Text style={[s.heroSub, { color: sub }]}>{heroSub}</Text>
          </Animated.View>
        </View>

        {/* PAY NOW button */}
        {isOnline && payStatus === "pending" && !!waylUrl && (
          <View style={s.btnWrap}>
            <Pressable
              onPress={openWayl}
              disabled={openingPayment}
              style={({ pressed }) => [s.payNowBtn, pressed && { opacity: 0.85 }, openingPayment && { opacity: 0.7 }]}
            >
              {openingPayment
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Feather name="credit-card" size={16} color="#fff" /><Text style={s.payNowTxt}>{isAr ? "ادفع الآن" : "PAY NOW"}</Text></>}
            </Pressable>
          </View>
        )}

        {/* Verify button */}
        {isOnline && payStatus === "pending" && (
          <View style={[s.btnWrap, { marginTop: 0 }]}>
            <Pressable
              onPress={() => verifyPayment()}
              disabled={verifying}
              style={({ pressed }) => [s.verifyBtn, pressed && { opacity: 0.85 }, verifying && { opacity: 0.7 }]}
            >
              {verifying
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Feather name="refresh-cw" size={14} color="#fff" /><Text style={s.verifyTxt}>{isAr ? "تحقق من الدفع" : "VERIFY PAYMENT"}</Text></>}
            </Pressable>
            <Text style={[s.verifyHint, { color: sub }]}>
              {isAr ? "دفعت مسبقاً؟ اضغط للتحقق من الحالة." : "Paid already? Tap to confirm your payment status."}
            </Text>
          </View>
        )}

        {/* Payment confirmed badge */}
        {isOnline && payStatus !== "pending" && (
          <View style={[s.statusBadge, { borderColor: payStatus === "paid" ? "#22C55E40" : "#EF444440", backgroundColor: payStatus === "paid" ? "#22C55E10" : "#EF444410" }]}>
            <Feather name={payStatus === "paid" ? "check-circle" : "x-circle"} size={15} color={payStatus === "paid" ? "#22C55E" : "#EF4444"} />
            <Text style={[s.statusTxt, { color: payStatus === "paid" ? "#22C55E" : "#EF4444" }]}>
              {payStatus === "paid"
                ? (isAr ? "تم تأكيد الدفع · Wayl" : "Payment Confirmed · Wayl")
                : (isAr ? "لم يكتمل الدفع" : "Payment Not Completed")}
            </Text>
          </View>
        )}

        {/* Section divider */}
        <View style={{ height: 1, backgroundColor: divider, marginTop: 8 }} />

        {/* Order items */}
        <Text style={[s.sectionHdr, { color: isDark ? "rgba(255,255,255,0.4)" : "#888" }]}>
          {isAr ? "طلباتك" : "YOUR ORDER"}
        </Text>
        {parsedItems.map((item, idx) => (
          <View key={idx}>
            <View style={[s.itemRow, isAr && { flexDirection: "row-reverse" }, { borderBottomColor: divider }]}>
              {item.image && (
                <Image source={{ uri: item.image }} style={s.itemImg} contentFit="cover" />
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[s.itemTitle, { color: textCol }, isAr && { textAlign: "right" }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {(item.size || item.color) && (
                  <Text style={[s.itemVariant, { color: sub }, isAr && { textAlign: "right" }]}>
                    {[item.size, item.color].filter(Boolean).join(" · ")}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: isAr ? "flex-start" : "flex-end", gap: 3 }}>
                <Text style={[s.itemQty, { color: sub }]}>×{item.quantity}</Text>
                <Text style={[s.itemPrice, { color: PRIMARY }]}>{formatIQD(item.price * item.quantity)}</Text>
              </View>
            </View>
          </View>
        ))}

        {/* Order totals */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: divider }}>
          <View style={[s.totalRow, isAr && { flexDirection: "row-reverse" }]}>
            <Text style={[s.totalLbl, { color: sub }]}>{isAr ? "الشحن" : "Shipping"}</Text>
            <Text style={[s.totalVal, { color: "#22C55E" }]}>{isAr ? "مجاني" : "Free"}</Text>
          </View>
          <View style={[s.totalRow, isAr && { flexDirection: "row-reverse" }]}>
            <Text style={[s.totalLblBold, { color: textCol }]}>{isAr ? "سعر الطلب كامل مع التوصيل" : "TOTAL"}</Text>
            <Text style={[s.totalBold, { color: PRIMARY }]}>{formatIQD(totalNum)}</Text>
          </View>
        </View>

        {/* Delivery details */}
        <Text style={[s.sectionHdr, { color: isDark ? "rgba(255,255,255,0.4)" : "#888" }]}>
          {isAr ? "تفاصيل التوصيل" : "DELIVERY DETAILS"}
        </Text>
        {detailRows.map((row, idx) => (
          <View key={row.label} style={[s.detailRow, isAr && { flexDirection: "row-reverse" }, { borderBottomColor: divider }, idx === detailRows.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[s.detailIcon, { backgroundColor: PRIMARY + "15" }]}>
              <Feather name={row.icon} size={13} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.detailLbl, { color: sub }, isAr && { textAlign: "right" }]}>{row.label}</Text>
              <Text style={[s.detailVal, { color: textCol }, isAr && { textAlign: "right" }]}>{row.value}</Text>
            </View>
          </View>
        ))}

      </ScrollView>

      {/* Continue shopping button */}
      <View style={[s.footer, { backgroundColor: bg, borderTopColor: divider, paddingBottom: insets.bottom + 12 + WEB_TAB_BAR_OFFSET }]}>
        <Pressable
          onPress={() => router.replace("/" as any)}
          style={({ pressed }) => [s.contBtn, isAr && { flexDirection: "row-reverse" }, pressed && { opacity: 0.82 }]}
        >
          <Text style={s.contTxt}>{isAr ? "تابع التسوق" : "CONTINUE SHOPPING"}</Text>
          <Feather name={isAr ? "arrow-left" : "arrow-right"} size={14} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1 },
  header:        { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, alignItems: "center" },
  headTitle:     { fontSize: 16, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  heroWrap:      { alignItems: "center", paddingVertical: 28, paddingHorizontal: 24, gap: 14 },
  heroCircle:    { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  heroTitle:     { fontSize: 24, fontWeight: "900", letterSpacing: -0.5, textAlign: "center" },
  orderBadge:    { borderWidth: 1, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 5 },
  orderBadgeTxt: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },
  heroSub:       { fontSize: 13, textAlign: "center", lineHeight: 19, maxWidth: 280 },
  btnWrap:       { paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  payNowBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#EB001B", height: 52, borderRadius: 4 },
  payNowTxt:     { color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  verifyBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: WAYL_BLUE, height: 46, borderRadius: 4 },
  verifyTxt:     { color: "#fff", fontSize: 13, fontWeight: "700", letterSpacing: 0.8 },
  verifyHint:    { textAlign: "center", fontSize: 11, marginTop: 4 },
  statusBadge:   { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 4, padding: 12, borderRadius: 4, borderWidth: 1 },
  statusTxt:     { fontSize: 12, fontWeight: "600" },
  sectionHdr:    { fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  itemRow:       { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  itemImg:       { width: 52, height: 64, borderRadius: 4 },
  itemTitle:     { fontSize: 13, fontWeight: "700" },
  itemVariant:   { fontSize: 11 },
  itemQty:       { fontSize: 11, fontWeight: "600" },
  itemPrice:     { fontSize: 14, fontWeight: "800" },
  totalRow:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 9 },
  totalLbl:      { fontSize: 13, fontWeight: "500" },
  totalVal:      { fontSize: 13, fontWeight: "700" },
  totalLblBold:  { fontSize: 14, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  totalBold:     { fontSize: 18, fontWeight: "900" },
  detailRow:     { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
  detailIcon:    { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  detailLbl:     { fontSize: 10, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 2 },
  detailVal:     { fontSize: 13, fontWeight: "600" },
  footer:        { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  contBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#111111", height: 52, borderRadius: 4 },
  contTxt:       { color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
});
