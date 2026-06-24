import React, { useState, useEffect } from "react";
import { LiquidGlassBg, isIOS26Plus } from "@/components/LiquidGlassBg";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useNotification } from "@/context/NotificationContext";
import { useLanguage } from "@/context/LanguageContext";
import { formatIQD } from "@/lib/format";
import { fetchShippingZones, fetchShippingRules, type ShippingZone, type ShippingRule } from "@/lib/api";
import { CompactPicker } from "@/components/CompactPicker";
import { GlassBackButton } from "@/components/GlassBackButton";

const PRIMARY = "#0274C1";

const PAYMENT_LOGOS = [
  { key: "mastercard", src: require("@/assets/payment/visa.webp")      as number },
  { key: "zaincash",   src: require("@/assets/payment/zaincash.png")   as number },
  { key: "fastpay",    src: require("@/assets/payment/fastpay.png")    as number },
  { key: "fib",        src: require("@/assets/payment/fib.jpeg")       as number },
  { key: "qicard",     src: require("@/assets/payment/qicard.png")     as number },
];

function getBaseUrl() {
  const d = process.env.EXPO_PUBLIC_DOMAIN;
  return d ? `https://${d}/api` : "/api";
}

function StepIndicator({ isDark }: { isDark: boolean }) {
  const steps = ["Cart", "Checkout", "Done"];
  const inactiveCir = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const inactiveTxt = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
  const inactiveLn  = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  return (
    <View style={si.container}>
      {steps.map((label, i) => {
        const step   = i + 1;
        const done   = step < 2;
        const active = step === 2;
        return (
          <React.Fragment key={label}>
            <View style={si.stepWrap}>
              <View style={[si.circle, { backgroundColor: active || done ? PRIMARY : "transparent", borderColor: active || done ? PRIMARY : inactiveCir }]}>
                {done ? <Feather name="check" size={11} color="#fff" />
                  : <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "#fff" : inactiveTxt }}>{step}</Text>}
              </View>
              <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", color: active ? PRIMARY : inactiveTxt, marginTop: 5 }}>{label}</Text>
            </View>
            {i < 2 && <View style={[si.line, { backgroundColor: step < 2 ? PRIMARY : inactiveLn }]} />}
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
  line:      { flex: 1, height: 1.5, marginBottom: 16 },
});

type FormState = { name: string; phone: string; city: string; district: string; street: string; note: string };
type PayMethod = "cod" | "online";

export default function CheckoutScreen() {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { startOrderActivity } = useNotification();
  const { lang } = useLanguage();

  const [form, setForm] = useState<FormState>({ name: "", phone: "", city: "", district: "", street: "", note: "" });
  const [payMethod, setPayMethod] = useState<PayMethod>("cod");
  const [submitting, setSubmitting] = useState(false);
  const [showGovPicker, setShowGovPicker] = useState(false);

  // Shipping state
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [rules, setRules] = useState<ShippingRule[]>([]);
  const [selectedZone, setSelectedZone] = useState<ShippingZone | null>(null);

  // Discount code state
  const [discountInput, setDiscountInput] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [discount, setDiscount] = useState<{ code: string; amount: number; freeShipping?: boolean } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  const discountAmount = discount?.amount ?? 0;
  const enabledThresholds = rules.map((r) => r.threshold).filter((t): t is number => t != null);
  const freeShipThreshold = enabledThresholds.length ? Math.min(...enabledThresholds) : null;
  const freeShipping = (discount?.freeShipping ?? false) || (freeShipThreshold != null && subtotal >= freeShipThreshold);
  const shipping = freeShipping ? 0 : (selectedZone?.price ?? 0);
  const grandTotal = Math.max(0, subtotal + shipping - discountAmount);
  // Holds the created order + Wayl link for online payments so a retry after a
  // failed/abandoned payment reuses the same order instead of creating a new one.
  const [pendingOnline, setPendingOnline] = useState<{
    orderId: string; orderNumber: string; orderTotal: number; waylUrl: string; snapshot: string;
  } | null>(null);

  const bg      = isDark ? "#0A0A0A" : "#FFFFFF";
  const card    = isDark ? "#1C1C1E" : "#EBF5FF";
  const textCol = isDark ? "#FFFFFF" : "#1A1A1A";
  const sub     = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)";
  const divClr  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";

  useEffect(() => {
    if (isLoading) return; // wait for auth state to hydrate
    if (!user) {
      router.replace({ pathname: "/auth", params: { returnTo: "/checkout" } } as any);
      return;
    }
    setForm((f) => ({
      ...f,
      name:     f.name     || `${user.firstName} ${user.lastName}`.trim(),
      phone:    f.phone    || user.phone || "",
      city:     f.city     || user.address?.city || "",
      district: f.district || user.address?.district || "",
      street:   f.street   || user.address?.street || "",
    }));
  }, [user, isLoading]);

  useEffect(() => {
    fetchShippingZones().then(setZones).catch(() => {});
    fetchShippingRules().then(setRules).catch(() => {});
  }, []);

  const set = (key: keyof FormState) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const buildSnapshot = () =>
    JSON.stringify(items.map((i) => ({ title: i.title, quantity: i.quantity, price: i.price, image: i.image, size: i.size, color: i.color })));

  // Persist the delivery address to the profile (best-effort, non-blocking)
  const saveAddressToProfile = (base: string) => {
    if (!token) return;
    fetch(`${base}/store/auth/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone: form.phone, address: { city: form.city, district: form.district, street: form.street } }),
    }).catch(() => {});
  };

  const applyDiscount = async () => {
    const code = discountInput.trim();
    if (!code) return;
    setApplyingDiscount(true);
    setDiscountError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await fetch(`${getBaseUrl()}/store/discounts/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal, itemCount }),
      });
      const json = await res.json() as { data: { code?: string; discountAmount?: number; type?: string } | null; error?: string };
      if (!res.ok || !json.data) {
        setDiscount(null);
        setDiscountError(json.error || "Invalid discount code");
        return;
      }
      setDiscount({ code: json.data.code || code.toUpperCase(), amount: Number(json.data.discountAmount) || 0, freeShipping: json.data.type === "free_shipping" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setDiscount(null);
      setDiscountError("Couldn't check the code. Please try again.");
    } finally {
      setApplyingDiscount(false);
    }
  };

  const removeDiscount = () => {
    setDiscount(null);
    setDiscountInput("");
    setDiscountError(null);
  };

  const createOrder = async (base: string) => {
    const orderRes = await fetch(`${base}/store/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        email: user?.email || "",
        subtotal,
        shipping,
        governorate: selectedZone?.governorate ?? "",
        discountCode: discount?.code,
        shippingAddress: { fullName: form.name, phone: form.phone, city: form.city, district: form.district, street: form.street },
        lineItems: items.map((i) => ({ productId: i.productId, variantId: i.variantId, title: i.title, quantity: i.quantity, price: i.price, size: i.size, color: i.color, image: i.image })),
        paymentMethod: payMethod,
        note: form.note,
      }),
    });
    const orderJson = await orderRes.json() as { data: { id?: string; order_number?: string; orderNumber?: string; total?: number } | null; error?: string };
    if (!orderRes.ok) throw new Error(orderJson.error || "Order failed");
    return {
      orderId:     (orderJson.data as any)?.id ?? "",
      orderNumber: orderJson.data?.order_number || orderJson.data?.orderNumber || "#—",
      orderTotal:  orderJson.data?.total ?? subtotal,
      snapshot:    buildSnapshot(),
    };
  };

  const createWaylLink = async (
    base: string, orderNumber: string, orderTotal: number,
  ): Promise<{ url: string | null; paid: boolean }> => {
    try {
      const waylRes = await fetch(`${base}/store/wayl/create-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          total: orderTotal,
          lineItems: items.map((i) => ({ title: i.title, quantity: i.quantity, price: i.price })),
          redirectionUrl: `https://${process.env.EXPO_PUBLIC_DOMAIN || "moramoda.tech"}/checkout/complete?fromWayl=1`,
        }),
      });
      const waylJson = await waylRes.json() as { data: { url?: string; paid?: boolean } | null; error?: string };
      return { url: waylJson.data?.url || null, paid: !!waylJson.data?.paid };
    } catch {
      return { url: null, paid: false };
    }
  };

  // Asks the server (which queries Wayl directly) whether the payment is settled.
  const checkWaylStatus = async (base: string, num: string): Promise<"paid" | "failed" | "pending"> => {
    try {
      const res = await fetch(`${base}/store/wayl/status/${num}`);
      const json = await res.json() as { data: { status?: string; paid?: boolean } | null };
      if (json.data?.paid || json.data?.status === "completed") return "paid";
      if (json.data?.status === "failed" || json.data?.status === "expired") return "failed";
    } catch { /* ignore */ }
    return "pending";
  };

  const handlePlaceOrder = async () => {
    if (!form.name.trim())     { Alert.alert("Missing", "Please enter your name"); return; }
    if (!form.phone.trim())    { Alert.alert("Missing", "Please enter your phone"); return; }
    if (!selectedZone)         { Alert.alert(lang === "ar" ? "مطلوب" : "Missing", lang === "ar" ? "يرجى اختيار المحافظة" : "Please select your governorate"); return; }
    if (!form.district.trim()) { Alert.alert("Missing", "Please enter your district/area"); return; }
    if (items.length === 0)    { Alert.alert("Empty Cart", "Your cart is empty"); return; }

    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const base = getBaseUrl();

    try {
      // ───────────── ONLINE PAYMENT (Wayl) ─────────────
      // We do NOT advance to the confirmation screen until the payment is
      // verified as paid. The order stays "pending" and the user stays on
      // checkout until Wayl confirms the transaction.
      if (payMethod === "online") {
        // Reuse the order/link from a previous attempt so retrying does not
        // create duplicate orders.
        let info = pendingOnline;

        // Step 1: ensure the order exists (created only once).
        if (!info) {
          const created = await createOrder(base);
          info = { ...created, waylUrl: "" };
          setPendingOnline(info);
          saveAddressToProfile(base);
        }

        // Step 2: ensure a Wayl link exists. If link creation failed on a
        // previous attempt, regenerate it for the SAME order (no duplicate).
        if (!info.waylUrl) {
          const wayl = await createWaylLink(base, info.orderNumber, info.orderTotal);
          // Fully-discounted order: nothing to pay, server already settled it.
          if (wayl.paid) {
            startOrderActivity({
              orderId: info.orderId,
              orderNumber: info.orderNumber,
              customerName: form.name || user?.firstName || "Customer",
              stage: "confirmed",
              message: "",
              priceText: formatIQD(info.orderTotal),
              isPaid: true,
            });
            clearCart();
            setPendingOnline(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace({
              pathname: "/checkout/complete",
              params: {
                orderNumber: info.orderNumber, total: String(info.orderTotal), name: form.name,
                city: form.city, district: form.district, phone: form.phone,
                items: info.snapshot, paymentMethod: "online", paid: "1", waylUrl: "",
              },
            } as any);
            return;
          }
          if (!wayl.url) throw new Error("Could not start the payment. Please try again.");
          info = { ...info, waylUrl: wayl.url };
          setPendingOnline(info);
        }

        // Web: redirect out to Wayl; the complete page verifies on return.
        if (Platform.OS === "web") {
          sessionStorage.setItem("mora_wayl_snap", JSON.stringify({
            orderNumber: info.orderNumber, total: info.orderTotal, name: form.name,
            city: form.city, district: form.district, phone: form.phone, snapshot: info.snapshot,
          }));
          (window as Window & typeof globalThis).location.href = info.waylUrl;
          return;
        }

        // Native: open the hosted payment page and wait for the user to finish.
        await WebBrowser.openBrowserAsync(info.waylUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        });

        // Verify BEFORE leaving checkout — poll a few times for processing lag.
        let status: "paid" | "failed" | "pending" = "pending";
        for (let i = 0; i < 5; i++) {
          status = await checkWaylStatus(base, info.orderNumber);
          if (status !== "pending") break;
          await new Promise((r) => setTimeout(r, 1500));
        }

        if (status !== "paid") {
          setSubmitting(false);
          Alert.alert(
            status === "failed" ? "Payment Failed" : "Payment Not Completed",
            status === "failed"
              ? "Your payment was not completed. You can try paying again."
              : "We couldn't confirm your payment yet. If you already paid, wait a moment and tap to pay again.",
          );
          return; // stay on checkout; pendingOnline kept for retry
        }

        // Paid ✓ — start the Live Activity, clear the cart and confirm.
        startOrderActivity({
          orderId: info.orderId,
          orderNumber: info.orderNumber,
          customerName: form.name || user?.firstName || "Customer",
          stage: "confirmed",
          message: "",
          priceText: formatIQD(info.orderTotal),
          isPaid: true,
        });
        clearCart();
        setPendingOnline(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({
          pathname: "/checkout/complete",
          params: {
            orderNumber: info.orderNumber, total: String(info.orderTotal), name: form.name,
            city: form.city, district: form.district, phone: form.phone,
            items: info.snapshot, paymentMethod: "online", paid: "1", waylUrl: "",
          },
        } as any);
        return;
      }

      // ───────────── CASH ON DELIVERY ─────────────
      const created = await createOrder(base);
      startOrderActivity({
        orderId: created.orderId,
        orderNumber: created.orderNumber,
        customerName: form.name || user?.firstName || "Customer",
        stage: "confirmed",
        message: "",
        priceText: formatIQD(created.orderTotal),
        isPaid: false,
      });
      clearCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      saveAddressToProfile(base);
      router.replace({
        pathname: "/checkout/complete",
        params: {
          orderNumber: created.orderNumber, total: String(created.orderTotal), name: form.name,
          city: form.city, district: form.district, phone: form.phone,
          items: created.snapshot, paymentMethod: "cod", waylUrl: "",
        },
      } as any);
    } catch (err: any) {
      setSubmitting(false);
      Alert.alert("Error", err.message || "Something went wrong. Please try again.");
    }
  };

  if (isLoading) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? "#0A0A0A" : "#F2F2F7" }}>
      <ActivityIndicator color="#0274C1" />
    </View>
  );
  if (!user) return null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={[{ flex: 1 }, { backgroundColor: bg }]}>

        <View style={[st.header, { paddingTop: insets.top + 6, paddingHorizontal: 16 }]}>
          <GlassBackButton
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/cart" as any);
            }}
          />
          <Text style={[st.headTitle, { color: textCol }]}>Checkout</Text>
          <View style={{ width: 36 }} />
        </View>

        <StepIndicator isDark={isDark} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

          {/* Delivery */}
          <Text style={[st.sectionLbl, { color: sub }]}>DELIVERY INFO</Text>
          <View style={[st.group, { backgroundColor: card }]}>
            <FieldRow label="Full Name"        value={form.name}     onChangeText={set("name")}     placeholder="Ahmed Al-Rashidi"   textCol={textCol} sub={sub} isDark={isDark} />
            <Divider color={divClr} />
            <FieldRow label="Phone"            value={form.phone}    onChangeText={set("phone")}    placeholder="+964 770 000 0000"  textCol={textCol} sub={sub} isDark={isDark} keyboardType="phone-pad" />
            <Divider color={divClr} />
            <Pressable style={st.fieldRow} onPress={() => setShowGovPicker(true)}>
              <Text style={[st.fieldLbl, { color: sub }]}>{lang === "ar" ? "المحافظة" : "Governorate"}</Text>
              <Text style={[st.fieldInput, { color: form.city ? textCol : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)") }]}>
                {form.city || (lang === "ar" ? "اختر المحافظة..." : "Select governorate...")}
              </Text>
              <Feather name="chevron-down" size={15} color={sub} />
            </Pressable>
            <Divider color={divClr} />
            <FieldRow label="District / Area"  value={form.district} onChangeText={set("district")} placeholder="Al-Mansour"         textCol={textCol} sub={sub} isDark={isDark} />
            <Divider color={divClr} />
            <FieldRow label="Street (optional)" value={form.street}  onChangeText={set("street")}   placeholder="Street 14, Bldg 3"  textCol={textCol} sub={sub} isDark={isDark} />
          </View>

          {/* Payment Method */}
          <Text style={[st.sectionLbl, { color: sub }]}>PAYMENT METHOD</Text>
          <View style={[st.group, { backgroundColor: card }]}>

            {/* Cash on Delivery */}
            <Pressable
              onPress={() => setPayMethod("cod")}
              style={[st.payCard, payMethod === "cod" && { backgroundColor: isDark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.06)" }]}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: payMethod === "cod" ? "rgba(34,197,94,0.18)" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"), alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 22 }}>💵</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[st.payTitle, { color: payMethod === "cod" ? "#22C55E" : textCol }]}>Cash on Delivery</Text>
                <Text style={[st.paySub, { color: sub }]}>Pay in cash when your order arrives</Text>
              </View>
              <View style={[st.radio, { borderColor: payMethod === "cod" ? "#22C55E" : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)") }]}>
                {payMethod === "cod" && <View style={[st.radioDot, { backgroundColor: "#22C55E" }]} />}
              </View>
            </Pressable>

            <Divider color={divClr} />

            {/* Online Payment — all logos */}
            <Pressable
              onPress={() => setPayMethod("online")}
              style={[st.payCard, payMethod === "online" && { backgroundColor: isDark ? "rgba(2,116,193,0.08)" : "rgba(2,116,193,0.06)" }]}
            >
              <View style={{ width: 44, alignItems: "flex-start", gap: 2 }}>
                <View style={{ flexDirection: "row", gap: 3 }}>
                  {PAYMENT_LOGOS.slice(0, 3).map((logo) => (
                    <Image key={logo.key} source={logo.src} style={{ width: 13, height: 13, borderRadius: 3 }} contentFit="cover" />
                  ))}
                </View>
                <View style={{ flexDirection: "row", gap: 3 }}>
                  {PAYMENT_LOGOS.slice(3).map((logo) => (
                    <Image key={logo.key} source={logo.src} style={{ width: 13, height: 13, borderRadius: 3 }} contentFit="cover" />
                  ))}
                </View>
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={[st.payTitle, { color: payMethod === "online" ? PRIMARY : textCol }]}>Online Payment</Text>
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {PAYMENT_LOGOS.map((logo) => (
                    <Image key={logo.key} source={logo.src} style={{ width: 28, height: 28, borderRadius: 7 }} contentFit="cover" />
                  ))}
                </View>
                <Text style={[st.paySub, { color: sub }]}>Card, wallet & more · secured via Wayl</Text>
              </View>
              <View style={[st.radio, { borderColor: payMethod === "online" ? PRIMARY : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)") }]}>
                {payMethod === "online" && <View style={[st.radioDot, { backgroundColor: PRIMARY }]} />}
              </View>
            </Pressable>

          </View>

          {/* Note */}
          <Text style={[st.sectionLbl, { color: sub }]}>ORDER NOTE (OPTIONAL)</Text>
          <View style={[st.group, { backgroundColor: card }]}>
            <TextInput
              value={form.note}
              onChangeText={set("note")}
              placeholder="Any notes for your order..."
              placeholderTextColor={sub}
              multiline
              numberOfLines={3}
              style={[st.noteInput, { color: textCol }]}
            />
          </View>

          {/* Discount Code */}
          <Text style={[st.sectionLbl, { color: sub }]}>DISCOUNT CODE</Text>
          <View style={[st.group, { backgroundColor: card, padding: 14, gap: 10 }]}>
            {discount ? (
              <View style={st.discountApplied}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(34,197,94,0.16)", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="check" size={16} color="#22C55E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: textCol }}>{discount.code}</Text>
                  <Text style={{ fontSize: 11, color: "#22C55E", marginTop: 1 }}>−{formatIQD(discount.amount)} applied</Text>
                </View>
                <Pressable onPress={removeDiscount} hitSlop={10} style={{ padding: 4 }}>
                  <Feather name="x" size={18} color={sub} />
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <TextInput
                  value={discountInput}
                  onChangeText={(t) => { setDiscountInput(t.toUpperCase()); if (discountError) setDiscountError(null); }}
                  placeholder="Enter code"
                  placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)"}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[st.discountInput, { color: textCol, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}
                />
                <Pressable
                  onPress={applyDiscount}
                  disabled={applyingDiscount || !discountInput.trim()}
                  style={({ pressed }) => [st.discountBtn, { backgroundColor: PRIMARY }, (pressed || applyingDiscount || !discountInput.trim()) && { opacity: 0.6 }]}
                >
                  {applyingDiscount ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>APPLY</Text>}
                </Pressable>
              </View>
            )}
            {discountError && (
              <Text style={{ fontSize: 12, color: "#EF4444" }}>{discountError}</Text>
            )}
          </View>

          {/* Order Summary */}
          <Text style={[st.sectionLbl, { color: sub }]}>ORDER SUMMARY</Text>
          <View style={[st.group, { backgroundColor: card }]}>
            {items.map((item) => (
              <View key={`${item.productId}-${item.variantId}`} style={st.summaryRow}>
                {item.image && <Image source={{ uri: item.image }} style={st.summaryImg} contentFit="cover" />}
                <View style={{ flex: 1 }}>
                  <Text style={[st.summaryTitle, { color: textCol }]} numberOfLines={1}>{item.title}</Text>
                  {(item.size || item.color) && <Text style={[{ fontSize: 11, marginTop: 2 }, { color: sub }]}>{[item.size, item.color].filter(Boolean).join(" · ")}</Text>}
                </View>
                <Text style={[{ fontSize: 12, fontWeight: "600" }, { color: sub }]}>×{item.quantity}</Text>
                <Text style={[{ fontSize: 13, fontWeight: "700", minWidth: 80, textAlign: "right" }, { color: textCol }]}>{formatIQD(item.price * item.quantity)}</Text>
              </View>
            ))}
            <View style={[st.divider, { backgroundColor: divClr }]} />
            <View style={st.totalRow}><Text style={[st.totalLbl, { color: sub }]}>Subtotal</Text><Text style={{ fontSize: 13, fontWeight: "600", color: textCol }}>{formatIQD(subtotal)}</Text></View>
            {discount && (
              <View style={st.totalRow}>
                <Text style={[st.totalLbl, { color: sub }]}>Discount ({discount.code})</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#22C55E" }}>−{formatIQD(discountAmount)}</Text>
              </View>
            )}
            <View style={st.totalRow}>
              <Text style={[st.totalLbl, { color: sub }]}>{lang === "ar" ? "الشحن" : "Shipping"}</Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: shipping === 0 ? "#22C55E" : textCol }}>
                {shipping === 0 ? (lang === "ar" ? "مجاني" : "Free") : formatIQD(shipping)}
              </Text>
            </View>
            <View style={st.totalRow}><Text style={[st.totalLbl, { color: textCol }]}>Total</Text><Text style={[st.totalAmt, { color: PRIMARY }]}>{formatIQD(grandTotal)}</Text></View>
          </View>

        </ScrollView>

        <CompactPicker
          visible={showGovPicker}
          title={lang === "ar" ? "اختر المحافظة" : "Select Governorate"}
          options={zones.map((z) => ({ label: lang === "ar" ? (z.governorateAr || z.governorate) : z.governorate, value: z.governorate }))}
          selectedValue={selectedZone?.governorate}
          onSelect={(val) => {
            const z = zones.find((zo) => zo.governorate === val) ?? null;
            setSelectedZone(z);
            if (z) set("city")(lang === "ar" ? (z.governorateAr || z.governorate) : z.governorate);
            setShowGovPicker(false);
          }}
          onCancel={() => setShowGovPicker(false)}
        />

        <View style={[
          st.footer,
          {
            backgroundColor: isIOS26Plus ? "transparent" : bg,
            paddingBottom: insets.bottom + 12,
          },
        ]}>
          <LiquidGlassBg />
          <Pressable
            onPress={handlePlaceOrder}
            disabled={submitting}
            style={({ pressed }) => [
              st.placeBtn,
              payMethod === "online" && { backgroundColor: "#7C3AED" },
              pressed && { opacity: 0.85 },
              submitting && { opacity: 0.7 },
            ]}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : payMethod === "online"
                ? <><Feather name="credit-card" size={16} color="#fff" /><Text style={st.placeTxt}>{pendingOnline ? "TRY PAYMENT AGAIN" : "PROCEED TO PAYMENT"}</Text></>
                : <><Feather name="check-circle" size={16} color="#fff" /><Text style={st.placeTxt}>PLACE ORDER</Text></>
            }
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={{ height: 1, backgroundColor: color, marginLeft: 16 }} />;
}

function FieldRow({ label, value, onChangeText, placeholder, keyboardType, textCol, sub, isDark }: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: any;
  textCol: string; sub: string; isDark: boolean;
}) {
  return (
    <View style={st.fieldRow}>
      <Text style={[st.fieldLbl, { color: sub }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)"}
        keyboardType={keyboardType} style={[st.fieldInput, { color: textCol }]} autoCapitalize="words" />
    </View>
  );
}

const st = StyleSheet.create({
  header:      { flexDirection: "row", alignItems: "center" },
  backBtn:     { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headTitle:   { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" },
  sectionLbl:  { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 20, marginBottom: 8, marginHorizontal: 20 },
  group:       { marginHorizontal: 16, borderRadius: 16, overflow: "hidden" },
  fieldRow:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  fieldLbl:    { fontSize: 12, fontWeight: "500", width: 108, flexShrink: 0 },
  fieldInput:  { flex: 1, fontSize: 14, fontWeight: "500", paddingVertical: 2 },
  payCard:     { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  payTitle:    { fontSize: 14, fontWeight: "600" },
  paySub:      { fontSize: 11, lineHeight: 15 },
  radio:       { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioDot:    { width: 10, height: 10, borderRadius: 5 },
  noteInput:   { padding: 16, fontSize: 14, minHeight: 72, textAlignVertical: "top" },
  discountInput: { flex: 1, height: 44, borderRadius: 12, paddingHorizontal: 14, fontSize: 14, fontWeight: "600", letterSpacing: 1 },
  discountBtn:  { height: 44, paddingHorizontal: 20, borderRadius: 12, alignItems: "center", justifyContent: "center", minWidth: 80 },
  discountApplied: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryRow:  { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  summaryImg:  { width: 42, height: 52, borderRadius: 8 },
  summaryTitle:{ fontSize: 13, fontWeight: "600" },
  divider:     { height: 1, marginHorizontal: 16, marginVertical: 4 },
  totalRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8 },
  totalLbl:    { fontSize: 14, fontWeight: "500" },
  totalAmt:    { fontSize: 16, fontWeight: "800" },
  footer:      { paddingHorizontal: 16, paddingTop: 12 },
  placeBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: PRIMARY, height: 54, borderRadius: 50 },
  placeTxt:    { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.8 },
});
