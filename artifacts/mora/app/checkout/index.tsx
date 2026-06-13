import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatIQD } from "@/lib/format";
import type { CartItem } from "@/lib/types";

const PRIMARY = "#0274C1";

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
              <View style={[si.circle, {
                backgroundColor: active || done ? PRIMARY : "transparent",
                borderColor: active || done ? PRIMARY : inactiveCir,
              }]}>
                {done
                  ? <Feather name="check" size={11} color="#fff" />
                  : <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "#fff" : inactiveTxt }}>{step}</Text>
                }
              </View>
              <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase",
                color: active ? PRIMARY : inactiveTxt, marginTop: 5 }}>
                {label}
              </Text>
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

type FormState = {
  name: string;
  phone: string;
  city: string;
  district: string;
  street: string;
  note: string;
};

export default function CheckoutScreen() {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token } = useAuth();
  const { items, subtotal, clearCart } = useCart();

  const [form, setForm] = useState<FormState>({
    name: "", phone: "", city: "", district: "", street: "", note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const bg      = isDark ? "#0A0A0A" : "#F2F2F7";
  const card    = isDark ? "#1C1C1E" : "#FFFFFF";
  const textCol = isDark ? "#FFFFFF" : "#1A1A1A";
  const sub     = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)";
  const inputBg = isDark ? "#2C2C2E" : "#F8F8F8";
  const border  = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  useEffect(() => {
    if (!user) {
      router.replace({ pathname: "/auth", params: { returnTo: "/checkout" } } as any);
      return;
    }
    setForm((f) => ({
      ...f,
      name:     `${user.firstName} ${user.lastName}`.trim(),
      phone:    user.phone || "",
      city:     user.address?.city || "",
      district: user.address?.district || "",
      street:   user.address?.street || "",
    }));
  }, [user]);

  const set = (key: keyof FormState) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handlePlaceOrder = async () => {
    if (!form.name.trim())     { Alert.alert("Missing", "Please enter your name"); return; }
    if (!form.phone.trim())    { Alert.alert("Missing", "Please enter your phone"); return; }
    if (!form.city.trim())     { Alert.alert("Missing", "Please enter your city"); return; }
    if (!form.district.trim()) { Alert.alert("Missing", "Please enter your area/district"); return; }
    if (items.length === 0)    { Alert.alert("Empty Cart", "Your cart is empty"); return; }

    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await fetch(`${getBaseUrl()}/store/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: user?.email || "",
          subtotal,
          shipping: 0,
          shippingAddress: {
            fullName:  form.name,
            phone:     form.phone,
            city:      form.city,
            district:  form.district,
            street:    form.street,
          },
          lineItems: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            title:     i.title,
            quantity:  i.quantity,
            price:     i.price,
            size:      i.size,
            color:     i.color,
            image:     i.image,
          })),
          paymentMethod: "cod",
          note: form.note,
        }),
      });

      const json = await res.json() as { data: { order_number?: string; orderNumber?: string; total?: number } | null; error?: string };
      if (!res.ok) throw new Error(json.error || "Order failed");

      const orderNumber = json.data?.order_number || json.data?.orderNumber || "#—";
      const orderTotal  = json.data?.total ?? subtotal;

      const snapshot = JSON.stringify(
        items.map((i) => ({ title: i.title, quantity: i.quantity, price: i.price, image: i.image, size: i.size, color: i.color }))
      );

      clearCart();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.replace({
        pathname: "/checkout/complete",
        params: {
          orderNumber,
          total:    String(orderTotal),
          name:     form.name,
          city:     form.city,
          district: form.district,
          phone:    form.phone,
          items:    snapshot,
        },
      } as any);
    } catch (err: any) {
      setSubmitting(false);
      Alert.alert("Error", err.message || "Something went wrong. Please try again.");
    }
  };

  if (!user) return null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={[{ flex: 1 }, { backgroundColor: bg }]}>
        <View style={[st.header, { paddingTop: insets.top + 6 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={st.backBtn}>
            <Feather name="arrow-left" size={22} color={textCol} />
          </Pressable>
          <Text style={[st.headTitle, { color: textCol }]}>Checkout</Text>
          <View style={{ width: 36 }} />
        </View>

        <StepIndicator isDark={isDark} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

          <Text style={[st.sectionLabel, { color: sub }]}>DELIVERY INFO</Text>
          <View style={[st.group, { backgroundColor: card }]}>
            <FieldRow label="Full Name" value={form.name} onChangeText={set("name")}
              placeholder="Ahmed Al-Rashidi" textCol={textCol} inputBg={inputBg} border={border} isDark={isDark} />
            <Divider isDark={isDark} />
            <FieldRow label="Phone" value={form.phone} onChangeText={set("phone")}
              placeholder="+964 7700000000" keyboardType="phone-pad" textCol={textCol} inputBg={inputBg} border={border} isDark={isDark} />
            <Divider isDark={isDark} />
            <FieldRow label="City" value={form.city} onChangeText={set("city")}
              placeholder="Baghdad" textCol={textCol} inputBg={inputBg} border={border} isDark={isDark} />
            <Divider isDark={isDark} />
            <FieldRow label="District / Area" value={form.district} onChangeText={set("district")}
              placeholder="Al-Mansour" textCol={textCol} inputBg={inputBg} border={border} isDark={isDark} />
            <Divider isDark={isDark} />
            <FieldRow label="Street (optional)" value={form.street} onChangeText={set("street")}
              placeholder="Street 14, Building 3" textCol={textCol} inputBg={inputBg} border={border} isDark={isDark} />
          </View>

          <Text style={[st.sectionLabel, { color: sub }]}>PAYMENT METHOD</Text>
          <View style={[st.group, { backgroundColor: card }]}>
            <View style={st.payCard}>
              <View style={st.payIcon}>
                <Feather name="dollar-sign" size={20} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[st.payTitle, { color: textCol }]}>Cash on Delivery</Text>
                <Text style={[st.paySub, { color: sub }]}>Pay when your order arrives</Text>
              </View>
              <View style={st.payCheck}>
                <Feather name="check" size={14} color="#fff" />
              </View>
            </View>
          </View>

          <Text style={[st.sectionLabel, { color: sub }]}>ORDER NOTE (OPTIONAL)</Text>
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

          <Text style={[st.sectionLabel, { color: sub }]}>ORDER SUMMARY</Text>
          <View style={[st.group, { backgroundColor: card }]}>
            {items.map((item) => (
              <View key={`${item.productId}-${item.variantId}`} style={st.summaryRow}>
                {item.image && (
                  <Image source={{ uri: item.image }} style={st.summaryImg} contentFit="cover" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[st.summaryTitle, { color: textCol }]} numberOfLines={1}>{item.title}</Text>
                  {(item.size || item.color) && (
                    <Text style={[st.summarySub, { color: sub }]}>{[item.size, item.color].filter(Boolean).join(" · ")}</Text>
                  )}
                </View>
                <Text style={[st.summaryQty, { color: sub }]}>×{item.quantity}</Text>
                <Text style={[st.summaryPrice, { color: textCol }]}>{formatIQD(item.price * item.quantity)}</Text>
              </View>
            ))}
            <View style={[st.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }]} />
            <View style={st.totalRow}>
              <Text style={[st.totalLabel, { color: sub }]}>Shipping</Text>
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#22C55E" }}>Free</Text>
            </View>
            <View style={st.totalRow}>
              <Text style={[st.totalLabel, { color: textCol }]}>Total</Text>
              <Text style={[st.totalAmt, { color: PRIMARY }]}>{formatIQD(subtotal)}</Text>
            </View>
          </View>

        </ScrollView>

        <View style={[st.footer, { backgroundColor: bg, paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            onPress={handlePlaceOrder}
            disabled={submitting}
            style={({ pressed }) => [st.placeBtn, pressed && { opacity: 0.85 }, submitting && { opacity: 0.7 }]}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={st.placeTxt}>PLACE ORDER</Text>
                  <Feather name="check-circle" size={16} color="#fff" />
                </>
            }
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Divider({ isDark }: { isDark: boolean }) {
  return <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)", marginLeft: 16 }} />;
}

function FieldRow({
  label, value, onChangeText, placeholder, keyboardType, textCol, inputBg, border, isDark,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: any;
  textCol: string; inputBg: string; border: string; isDark: boolean;
}) {
  return (
    <View style={st.fieldRow}>
      <Text style={[st.fieldLabel, { color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)" }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)"}
        keyboardType={keyboardType}
        style={[st.fieldInput, { color: textCol }]}
        autoCapitalize="words"
      />
    </View>
  );
}

const st = StyleSheet.create({
  header:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 },
  backBtn:      { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headTitle:    { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 20, marginBottom: 8, marginHorizontal: 20 },
  group:        { marginHorizontal: 16, borderRadius: 16, overflow: "hidden" },
  fieldRow:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  fieldLabel:   { fontSize: 13, fontWeight: "500", width: 110, flexShrink: 0 },
  fieldInput:   { flex: 1, fontSize: 14, fontWeight: "500", paddingVertical: 2 },
  payCard:      { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  payIcon:      { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(2,116,193,0.12)", alignItems: "center", justifyContent: "center" },
  payTitle:     { fontSize: 15, fontWeight: "600" },
  paySub:       { fontSize: 12, marginTop: 2 },
  payCheck:     { width: 22, height: 22, borderRadius: 11, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  noteInput:    { padding: 16, fontSize: 14, minHeight: 80, textAlignVertical: "top" },
  summaryRow:   { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  summaryImg:   { width: 44, height: 52, borderRadius: 8 },
  summaryTitle: { fontSize: 13, fontWeight: "600" },
  summarySub:   { fontSize: 11, marginTop: 2 },
  summaryQty:   { fontSize: 12, fontWeight: "600" },
  summaryPrice: { fontSize: 13, fontWeight: "700", minWidth: 80, textAlign: "right" },
  divider:      { height: 1, marginHorizontal: 16, marginVertical: 4 },
  totalRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8 },
  totalLabel:   { fontSize: 14, fontWeight: "500" },
  totalAmt:     { fontSize: 16, fontWeight: "800" },
  footer:       { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 0 },
  placeBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#111", height: 54, borderRadius: 50 },
  placeTxt:     { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.8 },
});
