import React, { useState, useEffect } from "react";
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
import { formatIQD } from "@/lib/format";
import { CompactPicker } from "@/components/CompactPicker";

const PRIMARY = "#0274C1";
const WAYL_BLUE = "#3B82F6";

const IRAQ_GOVERNORATES = [
  "Baghdad", "Basra", "Nineveh", "Erbil", "Sulaymaniyah",
  "Anbar", "Diyala", "Kirkuk", "Babylon", "Karbala",
  "Najaf", "Dhi Qar", "Maysan", "Muthanna", "Qadisiyyah",
  "Saladin", "Wasit", "Duhok",
].map((g) => ({ label: g, value: g }));

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
type PayMethod = "cod" | "wayl";

export default function CheckoutScreen() {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { startOrderActivity } = useNotification();

  const [form, setForm] = useState<FormState>({ name: "", phone: "", city: "", district: "", street: "", note: "" });
  const [payMethod, setPayMethod] = useState<PayMethod>("cod");
  const [submitting, setSubmitting] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

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

  const set = (key: keyof FormState) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handlePlaceOrder = async () => {
    if (!form.name.trim())     { Alert.alert("Missing", "Please enter your name"); return; }
    if (!form.phone.trim())    { Alert.alert("Missing", "Please enter your phone"); return; }
    if (!form.city.trim())     { Alert.alert("Missing", "Please enter your city"); return; }
    if (!form.district.trim()) { Alert.alert("Missing", "Please enter your district/area"); return; }
    if (items.length === 0)    { Alert.alert("Empty Cart", "Your cart is empty"); return; }

    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const base = getBaseUrl();

    try {
      const orderRes = await fetch(`${base}/store/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          email: user?.email || "",
          subtotal,
          shipping: 0,
          shippingAddress: { fullName: form.name, phone: form.phone, city: form.city, district: form.district, street: form.street },
          lineItems: items.map((i) => ({ productId: i.productId, variantId: i.variantId, title: i.title, quantity: i.quantity, price: i.price, size: i.size, color: i.color, image: i.image })),
          paymentMethod: payMethod,
          note: form.note,
        }),
      });
      const orderJson = await orderRes.json() as { data: { order_number?: string; orderNumber?: string; total?: number } | null; error?: string };
      if (!orderRes.ok) throw new Error(orderJson.error || "Order failed");

      const orderId     = (orderJson.data as any)?.id ?? "";
      const orderNumber = orderJson.data?.order_number || orderJson.data?.orderNumber || "#—";
      const orderTotal  = orderJson.data?.total ?? subtotal;
      const snapshot    = JSON.stringify(items.map((i) => ({ title: i.title, quantity: i.quantity, price: i.price, image: i.image, size: i.size, color: i.color })));

      // Start iOS Live Activity (Dynamic Island) — non-blocking, native-only
      startOrderActivity({
        orderId,
        orderNumber,
        customerName: form.name || user?.firstName || "Customer",
        stage: "confirmed",
        message: "Your order has been placed!",
      });

      let waylUrl: string | null = null;

      if (payMethod === "wayl") {
        try {
          const waylRes = await fetch(`${base}/store/wayl/create-link`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderNumber, total: orderTotal }),
          });
          const waylJson = await waylRes.json() as { data: { url?: string } | null; error?: string };
          waylUrl = waylJson.data?.url || null;
        } catch {
          // Non-fatal: we already created the order, continue without payment URL
        }
      }

      clearCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.replace({
        pathname: "/checkout/complete",
        params: { orderNumber, total: String(orderTotal), name: form.name, city: form.city, district: form.district, phone: form.phone, items: snapshot, paymentMethod: payMethod },
      } as any);

      if (payMethod === "wayl" && waylUrl) {
        await WebBrowser.openBrowserAsync(waylUrl, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN });
      }
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
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/(tabs)/cart" as any);
            }}
            hitSlop={16}
            style={st.backBtn}
          >
            <Feather name="arrow-left" size={22} color={textCol} />
          </Pressable>
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
            <Pressable style={st.fieldRow} onPress={() => setShowCityPicker(true)}>
              <Text style={[st.fieldLbl, { color: sub }]}>City</Text>
              <Text style={[st.fieldInput, { color: form.city ? textCol : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)") }]}>
                {form.city || "Select city..."}
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
            <PayOption
              selected={payMethod === "cod"}
              onPress={() => setPayMethod("cod")}
              icon="dollar-sign"
              iconColor={payMethod === "cod" ? PRIMARY : sub}
              iconBg={payMethod === "cod" ? "rgba(2,116,193,0.12)" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)")}
              title="Cash on Delivery"
              subtitle="Pay when your order arrives"
              textCol={textCol}
              sub={sub}
              isDark={isDark}
            />
            <Divider color={divClr} />
            <PayOption
              selected={payMethod === "wayl"}
              onPress={() => setPayMethod("wayl")}
              icon="credit-card"
              iconColor={payMethod === "wayl" ? WAYL_BLUE : sub}
              iconBg={payMethod === "wayl" ? "rgba(59,130,246,0.12)" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)")}
              title="Online Payment"
              subtitle="Zain Cash · FastPay · Asia Hawala · Visa"
              textCol={textCol}
              sub={sub}
              isDark={isDark}
              badge="Powered by Wayl"
            />
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
            <View style={st.totalRow}><Text style={[st.totalLbl, { color: sub }]}>Shipping</Text><Text style={{ fontSize: 13, fontWeight: "600", color: "#22C55E" }}>Free</Text></View>
            <View style={st.totalRow}><Text style={[st.totalLbl, { color: textCol }]}>Total</Text><Text style={[st.totalAmt, { color: PRIMARY }]}>{formatIQD(subtotal)}</Text></View>
          </View>

        </ScrollView>

        <CompactPicker
          visible={showCityPicker}
          title="Select Governorate"
          options={IRAQ_GOVERNORATES}
          selectedValue={form.city}
          onSelect={(val) => { set("city")(val); setShowCityPicker(false); }}
          onCancel={() => setShowCityPicker(false)}
        />

        <View style={[st.footer, { backgroundColor: bg, paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            onPress={handlePlaceOrder}
            disabled={submitting}
            style={({ pressed }) => [
              st.placeBtn,
              payMethod === "wayl" && { backgroundColor: WAYL_BLUE },
              pressed && { opacity: 0.85 },
              submitting && { opacity: 0.7 },
            ]}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Feather name={payMethod === "wayl" ? "credit-card" : "check-circle"} size={16} color="#fff" />
                  <Text style={st.placeTxt}>{payMethod === "wayl" ? "PROCEED TO PAYMENT" : "PLACE ORDER"}</Text>
                </>
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

function PayOption({ selected, onPress, icon, iconColor, iconBg, title, subtitle, textCol, sub, isDark, badge }: {
  selected: boolean; onPress: () => void; icon: any; iconColor: string; iconBg: string;
  title: string; subtitle: string; textCol: string; sub: string; isDark: boolean; badge?: string;
}) {
  const selectedBorder = icon === "credit-card" ? "rgba(59,130,246,0.3)" : "rgba(2,116,193,0.3)";
  const selectedCheck  = icon === "credit-card" ? "#3B82F6" : PRIMARY;
  return (
    <Pressable onPress={onPress} style={[st.payCard, selected && { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }]}>
      <View style={[st.payIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[st.payTitle, { color: textCol }]}>{title}</Text>
          {badge && <View style={st.badge}><Text style={st.badgeTxt}>{badge}</Text></View>}
        </View>
        <Text style={[st.paySub, { color: sub }]}>{subtitle}</Text>
      </View>
      <View style={[st.radio, { borderColor: selected ? selectedCheck : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)") }]}>
        {selected && <View style={[st.radioDot, { backgroundColor: selectedCheck }]} />}
      </View>
    </Pressable>
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
  payIcon:     { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  payTitle:    { fontSize: 14, fontWeight: "600" },
  paySub:      { fontSize: 11, lineHeight: 15 },
  radio:       { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioDot:    { width: 10, height: 10, borderRadius: 5 },
  badge:       { backgroundColor: "rgba(59,130,246,0.15)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeTxt:    { fontSize: 9, fontWeight: "700", color: "#3B82F6", letterSpacing: 0.3 },
  noteInput:   { padding: 16, fontSize: 14, minHeight: 72, textAlignVertical: "top" },
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
