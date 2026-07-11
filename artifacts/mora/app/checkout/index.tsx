import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { deliveryMessage } from "@/lib/deliveryMessage";
import { trackCartEvent } from "@/lib/tracking";
import { fetchShippingZones, fetchShippingRules, fetchDeliveryOptions, type ShippingZone, type ShippingRule, type DeliveryOptionsConfig } from "@/lib/api";
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

// ─── Step Bar ─────────────────────────────────────────────────────────────────
function StepBar({ isDark, isAr }: { isDark: boolean; isAr: boolean }) {
  const steps = isAr ? ["السلة", "الدفع", "تم"] : ["CART", "CHECKOUT", "DONE"];
  const dimText = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.22)";
  const dimLine = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  return (
    <View style={[sb.row, isAr && { flexDirection: "row-reverse" }]}>
      {steps.map((label, i) => {
        const step = i + 1;
        const active = step === 2;
        const done   = step < 2;
        return (
          <React.Fragment key={label}>
            <View style={sb.item}>
              <View style={sb.dot}>
                {done
                  ? <Feather name="check" size={13} color={PRIMARY} />
                  : <Text style={[sb.dotNum, { color: active ? PRIMARY : dimText }]}>{step}</Text>}
              </View>
              <Text style={[sb.lbl, { color: active ? PRIMARY : dimText }, active && { fontWeight: "800" }]}>
                {label}
              </Text>
            </View>
            {i < 2 && <View style={[sb.line, { backgroundColor: done ? PRIMARY : dimLine }]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const sb = StyleSheet.create({
  row:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 24, marginTop: 8, marginBottom: 6 },
  item:    { alignItems: "center", gap: 4 },
  dot:     { alignItems: "center", justifyContent: "center", paddingVertical: 2 },
  dotNum:  { fontSize: 13, fontWeight: "800" },
  lbl:     { fontSize: 9, fontWeight: "600", letterSpacing: 0.6, textTransform: "uppercase" },
  line:    { flex: 1, height: 1.5, marginBottom: 14 },
});

// ─── Types ────────────────────────────────────────────────────────────────────
type FormState    = { name: string; instagram: string; phone: string; phone2: string; city: string; district: string; landmark: string; street: string; note: string };
type PayMethod    = "cod" | "online";
type DeliveryType = "standard" | "express" | "pickup";

const DELIVERY_OPTIONS: { key: DeliveryType; icon: string; titleAr: string; titleEn: string; subAr: string; subEn: string }[] = [
  { key: "standard", icon: "🚚", titleAr: "توصيل عادي",      titleEn: "Standard Delivery", subAr: "يتم توصيل الطلب من 1–5 أيام", subEn: "Delivered in 1–5 days" },
  { key: "express",  icon: "⚡", titleAr: "توصيل سريع",      titleEn: "Express Delivery",  subAr: "يتم توصيل الطلب من 1–3 أيام", subEn: "Delivered in 1–3 days" },
  { key: "pickup",   icon: "🏬", titleAr: "استلام من المحل", titleEn: "Store Pickup",       subAr: "استلام من محلنا في بغداد",    subEn: "Pick up from our store in Baghdad" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <Text style={[sh.txt, { color: isDark ? "rgba(255,255,255,0.38)" : "#888888" }]}>{label}</Text>
  );
}
const sh = StyleSheet.create({
  txt: { fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", paddingHorizontal: 16, paddingTop: 22, paddingBottom: 10 },
});

function Divider({ color }: { color: string }) {
  return <View style={{ height: 1, backgroundColor: color, marginLeft: 16 }} />;
}

function FieldRow({
  label, value, onChangeText, placeholder, keyboardType, textCol, sub, isDark, isAr, autoCapitalize,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: any;
  textCol: string; sub: string; isDark: boolean; isAr?: boolean;
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
}) {
  const border = isDark ? "#1A1A1A" : "#EBEBEB";
  return (
    <View style={[fr.wrap, { borderBottomColor: border }]}>
      <Text style={[fr.lbl, { color: sub }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.2)"}
        keyboardType={keyboardType}
        textAlign={isAr ? "right" : "left"}
        style={[fr.input, { color: textCol }]}
        autoCapitalize={autoCapitalize ?? "words"}
      />
    </View>
  );
}
const fr = StyleSheet.create({
  wrap:  { borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
  lbl:   { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  input: { fontSize: 15, fontWeight: "600", paddingVertical: 0 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CheckoutScreen() {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { startOrderActivity } = useNotification();
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [form, setForm] = useState<FormState>({ name: "", instagram: "", phone: "", phone2: "", city: "", district: "", landmark: "", street: "", note: "" });
  const [payMethod, setPayMethod]     = useState<PayMethod>("cod");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("standard");
  const [submitting, setSubmitting]   = useState(false);
  const [showGovPicker, setShowGovPicker] = useState(false);

  const [zones, setZones]             = useState<ShippingZone[]>([]);
  const [rules, setRules]             = useState<ShippingRule[]>([]);
  const [selectedZone, setSelectedZone] = useState<ShippingZone | null>(null);
  const [deliveryOptionsConfig, setDeliveryOptionsConfig] = useState<DeliveryOptionsConfig>({
    standard: { enabled: true }, express: { enabled: true, price: 9000 }, pickup: { enabled: true },
  });

  const [discountInput, setDiscountInput]   = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [discount, setDiscount]             = useState<{ code: string; amount: number; freeShipping?: boolean } | null>(null);
  const [discountError, setDiscountError]   = useState<string | null>(null);

  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  const discountAmount   = discount?.amount ?? 0;
  const enabledThresholds = rules.map((r) => r.threshold).filter((t): t is number => t != null);
  const freeShipThreshold = enabledThresholds.length ? Math.min(...enabledThresholds) : null;
  const freeShipping = deliveryType !== "pickup" && ((discount?.freeShipping ?? false) || (freeShipThreshold != null && subtotal >= freeShipThreshold));
  const baseShipping = deliveryType === "pickup" ? 0 : deliveryType === "express" ? deliveryOptionsConfig.express.price : (selectedZone?.price ?? 0);
  const shipping     = freeShipping ? 0 : baseShipping;
  const grandTotal        = Math.max(0, subtotal + shipping - discountAmount);
  const originalSubtotal = items.reduce((s, i) => s + ((i.comparePrice && i.comparePrice > i.price ? i.comparePrice : i.price) * i.quantity), 0);
  const itemDiscount      = Math.max(0, originalSubtotal - subtotal);

  const [pendingOnline, setPendingOnline] = useState<{
    orderId: string; orderNumber: string; orderTotal: number; waylUrl: string; snapshot: string;
  } | null>(null);

  const bg      = isDark ? "#0A0A0A" : "#FFFFFF";
  const textCol = isDark ? "#FFFFFF" : "#111111";
  const sub     = isDark ? "rgba(255,255,255,0.38)" : "#888888";
  const divider = isDark ? "#1A1A1A" : "#EBEBEB";

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace({ pathname: "/auth", params: { returnTo: "/checkout" } } as any); return; }
    setForm((f) => ({
      ...f,
      name:      f.name      || `${user.firstName} ${user.lastName}`.trim(),
      instagram: f.instagram || (user.address as any)?.instagram || "",
      phone:     f.phone     || user.phone || "",
      phone2:    f.phone2    || (user.address as any)?.phone2 || "",
      city:      f.city      || user.address?.city || "",
      district:  f.district  || user.address?.district || "",
      landmark:  f.landmark  || (user.address as any)?.landmark || "",
      street:    f.street    || user.address?.street || "",
    }));
  }, [user, isLoading]);

  useEffect(() => {
    fetchShippingZones().then(setZones).catch(() => {});
    fetchShippingRules().then(setRules).catch(() => {});
    fetchDeliveryOptions().then(setDeliveryOptionsConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (!deliveryOptionsConfig[deliveryType]?.enabled) {
      const fallback = (["standard", "express", "pickup"] as DeliveryType[]).find((k) => deliveryOptionsConfig[k]?.enabled);
      if (fallback) setDeliveryType(fallback);
    }
  }, [deliveryOptionsConfig]);

  const set = (key: keyof FormState) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!zones.length || !form.city) return;
    const z = zones.find((zo) => zo.governorate === form.city || zo.governorateAr === form.city);
    if (!z) return;
    if (!selectedZone) setSelectedZone(z);
    const ar = z.governorateAr || z.governorate;
    if (form.city !== ar) set("city")(ar);
  }, [zones, form.city]);

  const buildSnapshot = () =>
    JSON.stringify(items.map((i) => ({ title: i.title, quantity: i.quantity, price: i.price, image: i.image, size: i.size, color: i.color })));

  const saveAddressToProfile = (base: string) => {
    if (!token) return;
    fetch(`${base}/store/auth/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ phone: form.phone, address: { city: form.city, district: form.district, street: form.street, instagram: form.instagram, phone2: form.phone2, landmark: form.landmark } }),
    }).catch(() => {});
  };

  const applyDiscount = async () => {
    const code = discountInput.trim();
    if (!code) return;
    setApplyingDiscount(true);
    setDiscountError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res  = await fetch(`${getBaseUrl()}/store/discounts/validate`, {
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
    } finally { setApplyingDiscount(false); }
  };

  const removeDiscount = () => { setDiscount(null); setDiscountInput(""); setDiscountError(null); };

  const createOrder = async (base: string) => {
    const orderRes = await fetch(`${base}/store/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        email: user?.email || "",
        subtotal, shipping,
        governorate: selectedZone?.governorate ?? "",
        discountCode: discount?.code,
        shippingAddress: { fullName: form.name, instagram: form.instagram, phone: form.phone, phone2: form.phone2, city: form.city, district: form.district, landmark: form.landmark, street: form.street },
        lineItems: items.map((i) => ({ productId: i.productId, variantId: i.variantId, title: i.title, quantity: i.quantity, price: i.price, size: i.size, color: i.color, image: i.image })),
        paymentMethod: payMethod,
        deliveryType,
        note: form.note,
      }),
    });
    const json = await orderRes.json() as { data: { id?: string; order_number?: string; orderNumber?: string; total?: number } | null; error?: string };
    if (!orderRes.ok) throw new Error(json.error || "Order failed");
    trackCartEvent(
      "checkout",
      json.data?.total ?? subtotal,
      items.map((i) => ({ productId: i.productId, title: i.title, quantity: i.quantity, price: i.price, size: i.size, color: i.color })),
    );
    return {
      orderId:     (json.data as any)?.id ?? "",
      orderNumber: json.data?.order_number || json.data?.orderNumber || "#—",
      orderTotal:  json.data?.total ?? subtotal,
      snapshot:    buildSnapshot(),
    };
  };

  const createWaylLink = async (base: string, orderNumber: string, orderTotal: number): Promise<{ url: string | null; paid: boolean }> => {
    try {
      const res  = await fetch(`${base}/store/wayl/create-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, total: orderTotal, lineItems: items.map((i) => ({ title: i.title, quantity: i.quantity, price: i.price })), redirectionUrl: `https://${process.env.EXPO_PUBLIC_DOMAIN || "moramoda.tech"}/checkout/complete?fromWayl=1` }),
      });
      const json = await res.json() as { data: { url?: string; paid?: boolean } | null };
      return { url: json.data?.url || null, paid: !!json.data?.paid };
    } catch { return { url: null, paid: false }; }
  };

  const checkWaylStatus = async (base: string, num: string): Promise<"paid" | "failed" | "pending"> => {
    try {
      const res  = await fetch(`${base}/store/wayl/status/${num}`);
      const json = await res.json() as { data: { status?: string; paid?: boolean } | null };
      if (json.data?.paid || json.data?.status === "completed") return "paid";
      if (json.data?.status === "failed" || json.data?.status === "expired") return "failed";
    } catch {}
    return "pending";
  };

  const handlePlaceOrder = async () => {
    if (!form.name.trim())     { Alert.alert(isAr ? "مطلوب" : "Required", isAr ? "يرجى إدخال اسمك" : "Please enter your name"); return; }
    if (!form.phone.trim())    { Alert.alert(isAr ? "مطلوب" : "Required", isAr ? "يرجى إدخال رقم هاتفك" : "Please enter your phone"); return; }
    if (!selectedZone && deliveryType !== "pickup") { Alert.alert(isAr ? "مطلوب" : "Required", isAr ? "يرجى اختيار المحافظة" : "Please select your governorate"); return; }
    if (!form.district.trim()) { Alert.alert(isAr ? "مطلوب" : "Required", isAr ? "يرجى إدخال المنطقة" : "Please enter your district"); return; }
    if (items.length === 0)    { Alert.alert(isAr ? "السلة فارغة" : "Empty Cart", isAr ? "لا يوجد منتجات" : "Your cart is empty"); return; }

    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const base = getBaseUrl();

    try {
      if (payMethod === "online") {
        let info = pendingOnline;
        if (!info) {
          const created = await createOrder(base);
          info = { ...created, waylUrl: "" };
          setPendingOnline(info);
          saveAddressToProfile(base);
        }
        if (!info.waylUrl) {
          const wayl = await createWaylLink(base, info.orderNumber, info.orderTotal);
          if (wayl.paid) {
            startOrderActivity({ orderId: info.orderId, orderNumber: info.orderNumber, customerName: form.name || user?.firstName || "Customer", stage: "confirmed", message: deliveryMessage(deliveryType, "confirmed"), deliveryType, priceText: formatIQD(info.orderTotal), isPaid: true });
            trackCartEvent("purchased", info.orderTotal, items.map((i) => ({ productId: i.productId, title: i.title, quantity: i.quantity, price: i.price, size: i.size, color: i.color })));
            clearCart(); setPendingOnline(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace({ pathname: "/checkout/complete", params: { orderNumber: info.orderNumber, total: String(info.orderTotal), name: form.name, city: form.city, district: form.district, phone: form.phone, items: info.snapshot, paymentMethod: "online", paid: "1", waylUrl: "" } } as any);
            return;
          }
          if (!wayl.url) throw new Error(isAr ? "تعذّر بدء الدفع، حاول مجدداً" : "Could not start payment. Please try again.");
          info = { ...info, waylUrl: wayl.url };
          setPendingOnline(info);
        }
        if (Platform.OS === "web") {
          sessionStorage.setItem("mora_wayl_snap", JSON.stringify({ orderNumber: info.orderNumber, total: info.orderTotal, name: form.name, city: form.city, district: form.district, phone: form.phone, snapshot: info.snapshot }));
          (window as Window & typeof globalThis).location.href = info.waylUrl;
          return;
        }
        await WebBrowser.openBrowserAsync(info.waylUrl, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN });
        let status: "paid" | "failed" | "pending" = "pending";
        for (let i = 0; i < 5; i++) {
          status = await checkWaylStatus(base, info.orderNumber);
          if (status !== "pending") break;
          await new Promise((r) => setTimeout(r, 1500));
        }
        if (status !== "paid") {
          setSubmitting(false);
          Alert.alert(
            status === "failed" ? (isAr ? "فشل الدفع" : "Payment Failed") : (isAr ? "لم يكتمل الدفع" : "Payment Incomplete"),
            status === "failed"
              ? (isAr ? "لم يكتمل دفعك. يمكنك المحاولة مجدداً." : "Your payment was not completed. Try again.")
              : (isAr ? "لم نتمكن من تأكيد دفعك. إذا دفعت، انتظر وحاول مجدداً." : "Couldn't confirm payment. If you paid, wait and try again."),
          );
          return;
        }
        startOrderActivity({ orderId: info.orderId, orderNumber: info.orderNumber, customerName: form.name || user?.firstName || "Customer", stage: "confirmed", message: deliveryMessage(deliveryType, "confirmed"), deliveryType, priceText: formatIQD(info.orderTotal), isPaid: true });
        trackCartEvent("purchased", info.orderTotal, items.map((i) => ({ productId: i.productId, title: i.title, quantity: i.quantity, price: i.price, size: i.size, color: i.color })));
        clearCart(); setPendingOnline(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({ pathname: "/checkout/complete", params: { orderNumber: info.orderNumber, total: String(info.orderTotal), name: form.name, city: form.city, district: form.district, phone: form.phone, items: info.snapshot, paymentMethod: "online", paid: "1", waylUrl: "" } } as any);
        return;
      }

      // COD
      const created = await createOrder(base);
      startOrderActivity({ orderId: created.orderId, orderNumber: created.orderNumber, customerName: form.name || user?.firstName || "Customer", stage: "confirmed", message: deliveryMessage(deliveryType, "confirmed"), deliveryType, priceText: formatIQD(created.orderTotal), isPaid: false });
      trackCartEvent("purchased", created.orderTotal, items.map((i) => ({ productId: i.productId, title: i.title, quantity: i.quantity, price: i.price, size: i.size, color: i.color })));
      clearCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      saveAddressToProfile(base);
      router.replace({ pathname: "/checkout/complete", params: { orderNumber: created.orderNumber, total: String(created.orderTotal), name: form.name, city: form.city, district: form.district, phone: form.phone, items: created.snapshot, paymentMethod: "cod", waylUrl: "" } } as any);
    } catch (err: any) {
      setSubmitting(false);
      Alert.alert(isAr ? "خطأ" : "Error", err.message || (isAr ? "حدث خطأ، حاول مجدداً" : "Something went wrong."));
    }
  };

  if (isLoading) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: bg }}>
      <ActivityIndicator color={PRIMARY} />
    </View>
  );
  if (!user) return null;

  return (
    <View style={[{ flex: 1 }, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[st.header, { paddingTop: insets.top + 6, borderBottomColor: divider }]}>
        <GlassBackButton onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/cart" as any); }} />
        <Text style={[st.headTitle, { color: textCol }]}>{isAr ? "الدفع" : "CHECKOUT"}</Text>
        <View style={{ width: 36 }} />
      </View>

      <StepBar isDark={isDark} isAr={isAr} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      >

        {/* ── DELIVERY INFO ── */}
        <SectionHeader label={isAr ? "معلومات التوصيل" : "DELIVERY INFO"} isDark={isDark} />
        <View style={{ borderTopWidth: 1, borderTopColor: divider }}>
          <FieldRow label={isAr ? "الاسم الكامل" : "Full Name"} value={form.name} onChangeText={set("name")} placeholder={isAr ? "محمد عبدالكريم" : "Ahmed Al-Rashidi"} textCol={textCol} sub={sub} isDark={isDark} isAr={isAr} />
          <FieldRow label="Instagram" value={form.instagram} onChangeText={set("instagram")} placeholder="يوزر انستا" textCol={textCol} sub={sub} isDark={isDark} isAr={true} autoCapitalize="none" />
          <FieldRow label={isAr ? "رقم تلفون اساسي" : "PRIMARY PHONE"} value={form.phone} onChangeText={set("phone")} placeholder="+964 770 000 0000" textCol={textCol} sub={sub} isDark={isDark} isAr={isAr} keyboardType="phone-pad" />
          <FieldRow label={isAr ? "رقم تلفون احتياطي" : "BACKUP PHONE"} value={form.phone2} onChangeText={set("phone2")} placeholder="+964 770 000 0000" textCol={textCol} sub={sub} isDark={isDark} isAr={isAr} keyboardType="phone-pad" />

          {/* Governorate picker */}
          <Pressable
            style={[fr2.govRow, { borderBottomColor: divider }, isAr && { flexDirection: "row-reverse" }]}
            onPress={() => setShowGovPicker((v) => !v)}
          >
            <View style={{ flex: 1 }}>
              <Text style={[fr2.govLbl, { color: sub }]}>{isAr ? "المحافظة" : "Governorate"}</Text>
              <Text style={[fr2.govVal, { color: form.city ? textCol : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)") }]}>
                {form.city || (isAr ? "اختر المحافظة..." : "Select governorate...")}
              </Text>
            </View>
            <Feather name={showGovPicker ? "chevron-up" : "chevron-down"} size={16} color={sub} />
          </Pressable>

          {showGovPicker && (
            <View style={[fr2.dropdown, { backgroundColor: isDark ? "#111" : "#FAFAFA", borderColor: divider }]}>
              <ScrollView style={{ maxHeight: 224 }} showsVerticalScrollIndicator={false} bounces={false} nestedScrollEnabled>
                {zones.map((z, idx) => {
                  const label = isAr ? (z.governorateAr || z.governorate) : z.governorate;
                  const selected = selectedZone?.governorate === z.governorate;
                  return (
                    <Pressable
                      key={z.governorate}
                      style={({ pressed }) => [
                        fr2.dropRow,
                        isAr && { flexDirection: "row-reverse" },
                        idx < zones.length - 1 && { borderBottomWidth: 1, borderBottomColor: divider },
                        pressed && { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" },
                      ]}
                      onPress={() => { setSelectedZone(z); set("city")(z.governorateAr || z.governorate); setShowGovPicker(false); }}
                    >
                      <Text style={[fr2.dropLbl, { color: selected ? PRIMARY : textCol, fontWeight: selected ? "700" : "500" }]}>{label}</Text>
                      {selected && <Feather name="check" size={14} color={PRIMARY} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <FieldRow label={isAr ? "المنطقة / الحي" : "District / Area"} value={form.district} onChangeText={set("district")} placeholder={isAr ? "المنصور" : "Al-Mansour"} textCol={textCol} sub={sub} isDark={isDark} isAr={isAr} />
        </View>

        {/* ── DELIVERY TYPE ── */}
        <SectionHeader label={isAr ? "خيارات التوصيل" : "DELIVERY TYPE"} isDark={isDark} />
        <View style={{ borderTopWidth: 1, borderTopColor: divider }}>
          {DELIVERY_OPTIONS.filter((opt) => deliveryOptionsConfig[opt.key]?.enabled).map((opt, idx) => {
            const selected = deliveryType === opt.key;
            const priceLabel =
              opt.key === "pickup" ? (isAr ? "مجاني" : "FREE")
              : opt.key === "express" ? formatIQD(deliveryOptionsConfig.express.price)
              : selectedZone ? formatIQD(selectedZone.price) : null;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setDeliveryType(opt.key)}
                style={[st.optRow, isAr && { flexDirection: "row-reverse" }, { borderBottomColor: divider }, selected && { backgroundColor: isDark ? "rgba(2,116,193,0.06)" : "rgba(2,116,193,0.04)" }]}
              >
                <Text style={{ fontSize: 22, lineHeight: 28 }}>{opt.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[st.optTitle, { color: selected ? PRIMARY : textCol }, isAr && { textAlign: "right" }]}>
                    {isAr ? opt.titleAr : opt.titleEn}
                  </Text>
                  <Text style={[st.optSub, { color: sub }, isAr && { textAlign: "right" }]}>
                    {isAr ? opt.subAr : opt.subEn}{priceLabel ? ` · ${priceLabel}` : ""}
                  </Text>
                </View>
                <View style={[st.radio, { borderColor: selected ? PRIMARY : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)") }]}>
                  {selected && <View style={[st.radioDot, { backgroundColor: PRIMARY }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── PAYMENT METHOD ── */}
        <SectionHeader label={isAr ? "شلون تكدر تدفع؟" : "PAYMENT METHOD"} isDark={isDark} />
        <View style={{ borderTopWidth: 1, borderTopColor: divider }}>
          {/* COD */}
          <Pressable
            onPress={() => setPayMethod("cod")}
            style={[st.optRow, isAr && { flexDirection: "row-reverse" }, { borderBottomColor: divider }, payMethod === "cod" && { backgroundColor: isDark ? "rgba(34,197,94,0.06)" : "rgba(34,197,94,0.04)" }]}
          >
            <View style={[st.payIcon, { backgroundColor: payMethod === "cod" ? "rgba(34,197,94,0.15)" : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)") }]}>
              <Text style={{ fontSize: 20, lineHeight: 24 }}>💵</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.optTitle, { color: payMethod === "cod" ? "#22C55E" : textCol }, isAr && { textAlign: "right" }]}>
                {isAr ? "الدفع عند الاستلام" : "Cash on Delivery"}
              </Text>
              <Text style={[st.optSub, { color: sub }, isAr && { textAlign: "right" }]}>
                {isAr ? "يوصلني الطلب وأكدره بعدين استلمه" : "Pay cash when your order arrives"}
              </Text>
            </View>
            <View style={[st.radio, { borderColor: payMethod === "cod" ? "#22C55E" : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)") }]}>
              {payMethod === "cod" && <View style={[st.radioDot, { backgroundColor: "#22C55E" }]} />}
            </View>
          </Pressable>

          {/* Online */}
          <Pressable
            onPress={() => setPayMethod("online")}
            style={[st.optRow, isAr && { flexDirection: "row-reverse" }, { borderBottomColor: divider, borderBottomWidth: 0 }, payMethod === "online" && { backgroundColor: isDark ? "rgba(2,116,193,0.06)" : "rgba(2,116,193,0.04)" }]}
          >
            <View style={[st.payIcon, { backgroundColor: payMethod === "online" ? "rgba(2,116,193,0.15)" : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"), gap: 3 }]}>
              {PAYMENT_LOGOS.slice(0, 2).map((l) => (
                <Image key={l.key} source={l.src} style={{ width: 14, height: 14, borderRadius: 3 }} contentFit="cover" />
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.optTitle, { color: payMethod === "online" ? PRIMARY : textCol }, isAr && { textAlign: "right" }]}>
                {isAr ? "الدفع الإلكتروني" : "Online Payment"}
              </Text>
              <View style={{ flexDirection: isAr ? "row-reverse" : "row", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
                {PAYMENT_LOGOS.map((l) => (
                  <Image key={l.key} source={l.src} style={{ width: 26, height: 26, borderRadius: 6 }} contentFit="cover" />
                ))}
              </View>
              <Text style={[st.optSub, { color: sub, marginTop: 4 }, isAr && { textAlign: "right" }]}>
                {isAr ? "بطاقة، محفظة وأكثر · مؤمّن عبر Wayl" : "Card, wallet & more · secured via Wayl"}
              </Text>
            </View>
            <View style={[st.radio, { borderColor: payMethod === "online" ? PRIMARY : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)"), alignSelf: "flex-start", marginTop: 2 }]}>
              {payMethod === "online" && <View style={[st.radioDot, { backgroundColor: PRIMARY }]} />}
            </View>
          </Pressable>
        </View>

        {/* ── ORDER NOTE ── */}
        <SectionHeader label={isAr ? "ملاحظة (اختياري)" : "ORDER NOTE (OPTIONAL)"} isDark={isDark} />
        <View style={{ borderTopWidth: 1, borderTopColor: divider, borderBottomWidth: 1, borderBottomColor: divider }}>
          <TextInput
            value={form.note}
            onChangeText={set("note")}
            placeholder={isAr ? "أي ملاحظات على طلبك..." : "Any notes for your order..."}
            placeholderTextColor={isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.2)"}
            multiline
            numberOfLines={3}
            textAlign={isAr ? "right" : "left"}
            style={[{ color: textCol, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, minHeight: 72, textAlignVertical: "top" }]}
          />
        </View>

        {/* ── PROMO CODE ── */}
        <SectionHeader label={isAr ? "رمز الخصم" : "PROMO CODE"} isDark={isDark} />
        <View style={{ padding: 14 }}>
          {discount ? (
            <View style={[dc.applied, isAr && { flexDirection: "row-reverse" }]}>
              <View style={dc.checkCircle}>
                <Feather name="check" size={14} color="#22C55E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[dc.code, { color: textCol }]}>{discount.code}</Text>
                <Text style={[dc.savings, isAr && { textAlign: "right" }]}>
                  {isAr ? `−${formatIQD(discount.amount)} مطبّق` : `−${formatIQD(discount.amount)} applied`}
                </Text>
              </View>
              <Pressable onPress={removeDiscount} hitSlop={12}>
                <Feather name="x" size={18} color={sub} />
              </Pressable>
            </View>
          ) : (
            <View style={[dc.inputRow, isAr && { flexDirection: "row-reverse" }]}>
              <TextInput
                value={discountInput}
                onChangeText={(t) => { setDiscountInput(t.toUpperCase()); if (discountError) setDiscountError(null); }}
                placeholder={isAr ? "اذا كان لديك كود خصم اكتبه هنا" : "ENTER CODE"}
                placeholderTextColor={isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.2)"}
                autoCapitalize="characters"
                autoCorrect={false}
                textAlign={isAr ? "right" : "left"}
                style={[dc.input, { color: textCol, backgroundColor: isDark ? "#1A1A1A" : "#F5F5F5", borderColor: discountError ? "#EF4444" : divider }]}
              />
              <Pressable
                onPress={applyDiscount}
                disabled={applyingDiscount || !discountInput.trim()}
                style={({ pressed }) => [dc.applyBtn, (pressed || applyingDiscount || !discountInput.trim()) && { opacity: 0.55 }]}
              >
                {applyingDiscount
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={dc.applyTxt}>{isAr ? "تطبيق" : "APPLY"}</Text>}
              </Pressable>
            </View>
          )}
          {discountError && (
            <Text style={{ fontSize: 12, color: "#EF4444", marginTop: 8 }}>{discountError}</Text>
          )}
        </View>

        {/* ── ORDER SUMMARY ── */}
        <SectionHeader label={isAr ? "ملخص الطلب" : "ORDER SUMMARY"} isDark={isDark} />
        <View>
          {items.map((item) => (
            <View key={`${item.productId}-${item.variantId}`} style={[st.summaryRow, isAr && { flexDirection: "row-reverse" }]}>
              {item.image && <Image source={{ uri: item.image }} style={st.summaryImg} contentFit="cover" />}
              <View style={{ flex: 1 }}>
                <Text style={[st.summaryTitle, { color: textCol }, isAr && { textAlign: "right" }]} numberOfLines={1}>{item.title}</Text>
                {(item.size || item.color) && (
                  <Text style={[st.summarySub, { color: sub }, isAr && { textAlign: "right" }]}>
                    {[item.size, item.color].filter(Boolean).join(" · ")}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: isAr ? "flex-start" : "flex-end", gap: 2 }}>
                <Text style={[st.summaryQty, { color: sub }]}>×{item.quantity}</Text>
                <Text style={[st.summaryAmt, { color: textCol }]}>{formatIQD(item.price * item.quantity)}</Text>
              </View>
            </View>
          ))}

          {/* Totals */}
          <View style={{ borderTopWidth: 1, borderTopColor: divider }}>
            <View style={[st.totalRow, isAr && { flexDirection: "row-reverse" }, { borderBottomColor: divider }]}>
              <Text style={[st.totalLbl, { color: sub }]}>{isAr ? "سعر المنتجات" : "Subtotal"}</Text>
              <Text style={[st.totalVal, { color: textCol }]}>{formatIQD(itemDiscount > 0 ? originalSubtotal : subtotal)}</Text>
            </View>
            {itemDiscount > 0 && (
              <View style={[st.totalRow, isAr && { flexDirection: "row-reverse" }, { borderBottomColor: divider }]}>
                <Text style={[st.totalLbl, { color: PRIMARY }]}>{isAr ? "هلكد انخصملك" : "Discount"}</Text>
                <Text style={[st.totalVal, { color: PRIMARY }]}>−{formatIQD(itemDiscount)}</Text>
              </View>
            )}
            {discount && (
              <View style={[st.totalRow, isAr && { flexDirection: "row-reverse" }, { borderBottomColor: divider }]}>
                <Text style={[st.totalLbl, { color: PRIMARY }]}>{isAr ? `رمز الخصم (${discount.code})` : `Discount (${discount.code})`}</Text>
                <Text style={[st.totalVal, { color: PRIMARY }]}>−{formatIQD(discountAmount)}</Text>
              </View>
            )}
            {deliveryType !== "pickup" && (
              <View style={[st.totalRow, isAr && { flexDirection: "row-reverse" }, { borderBottomColor: divider }]}>
                <Text style={[st.totalLbl, { color: sub }]}>{isAr ? "سعر التوصيل" : "Shipping"}</Text>
                {shipping === 0 && selectedZone && selectedZone.price > 0 ? (
                  <View style={[{ flexDirection: "row", alignItems: "center", gap: 6 }, isAr && { flexDirection: "row-reverse" }]}>
                    <Text style={[st.totalVal, { color: "#EF4444", textDecorationLine: "line-through" }]}>
                      {formatIQD(selectedZone.price)}
                    </Text>
                    <Text style={[st.totalVal, { color: PRIMARY, fontWeight: "800" }]}>
                      {isAr ? "مجاني" : "FREE"}
                    </Text>
                  </View>
                ) : (
                  <Text style={[st.totalVal, { color: shipping === 0 ? PRIMARY : textCol }]}>
                    {shipping === 0 ? (isAr ? "مجاني" : "FREE") : formatIQD(shipping)}
                  </Text>
                )}
              </View>
            )}
            <View style={[st.totalRow, isAr && { flexDirection: "row-reverse" }, { borderBottomColor: divider, borderBottomWidth: 0, paddingVertical: 16 }]}>
              <Text style={[st.totalLblBold, { color: textCol }]}>{isAr ? "سعر الطلب كامل مع التوصيل" : "TOTAL"}</Text>
              <Text style={[st.totalBold, { color: PRIMARY }]}>{formatIQD(grandTotal)}</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Footer CTA */}
      <View style={[st.footer, { backgroundColor: bg, borderTopColor: divider, paddingBottom: Platform.OS === "web" ? 76 : insets.bottom + 12 }]}>
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
              ? <><Feather name="credit-card" size={16} color="#fff" /><Text style={st.placeTxt}>{isAr ? (pendingOnline ? "حاول مجدداً" : "متابعة الدفع") : (pendingOnline ? "TRY PAYMENT AGAIN" : "PROCEED TO PAYMENT")}</Text></>
              : <><Feather name="lock" size={15} color="#fff" /><Text style={st.placeTxt}>{isAr ? "تثبيت الطلب" : "PLACE ORDER"}</Text></>}
        </Pressable>
      </View>
    </View>
  );
}

const fr2 = StyleSheet.create({
  govRow:    { paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, gap: 12 },
  govLbl:    { fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 },
  govVal:    { fontSize: 15, fontWeight: "600" },
  dropdown:  { marginHorizontal: 0, borderWidth: 1, borderTopWidth: 0 },
  dropRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  dropLbl:   { fontSize: 14 },
});

const dc = StyleSheet.create({
  inputRow:  { flexDirection: "row", gap: 10, alignItems: "center" },
  input:     { flex: 1, height: 46, borderWidth: 1, borderRadius: 4, paddingHorizontal: 14, fontSize: 13, fontWeight: "700", letterSpacing: 1.5 },
  applyBtn:  { height: 46, paddingHorizontal: 20, borderRadius: 4, alignItems: "center", justifyContent: "center", backgroundColor: "#111111", minWidth: 80 },
  applyTxt:  { color: "#fff", fontSize: 12, fontWeight: "800", letterSpacing: 0.8 },
  applied:   { flexDirection: "row", alignItems: "center", gap: 12 },
  checkCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(34,197,94,0.12)", alignItems: "center", justifyContent: "center" },
  code:      { fontSize: 14, fontWeight: "700" },
  savings:   { fontSize: 12, color: "#22C55E", marginTop: 2 },
});

const st = StyleSheet.create({
  header:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headTitle:    { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  optRow:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14, borderBottomWidth: 1 },
  optTitle:     { fontSize: 14, fontWeight: "700" },
  optSub:       { fontSize: 11, lineHeight: 16, marginTop: 2 },
  payIcon:      { width: 42, height: 42, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  radio:        { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  radioDot:     { width: 10, height: 10, borderRadius: 5 },
  summaryRow:   { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  summaryImg:   { width: 44, height: 54, borderRadius: 4 },
  summaryTitle: { fontSize: 13, fontWeight: "600" },
  summarySub:   { fontSize: 11, marginTop: 2 },
  summaryQty:   { fontSize: 11, fontWeight: "600" },
  summaryAmt:   { fontSize: 13, fontWeight: "700" },
  totalRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  totalLbl:     { fontSize: 13, fontWeight: "500" },
  totalVal:     { fontSize: 13, fontWeight: "600" },
  totalLblBold: { fontSize: 14, fontWeight: "900", letterSpacing: 0.5, textTransform: "uppercase" },
  totalBold:    { fontSize: 19, fontWeight: "900" },
  footer:       { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  placeBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#111111", height: 52, borderRadius: 4 },
  placeTxt:     { color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
});
