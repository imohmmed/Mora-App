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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { SeoHead } from "@/components/SeoHead";
import { GlassBackButton } from "@/components/GlassBackButton";
import { fetchShippingZones, type ShippingZone } from "@/lib/api";

const PRIMARY = "#0274C1";

function FieldRow({
  label, value, onChangeText, placeholder, keyboardType, textCol, sub, isDark, isAr,
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: any;
  textCol: string; sub: string; isDark: boolean; isAr?: boolean;
}) {
  const border = isDark ? "#1A1A1A" : "#EBEBEB";
  return (
    <View style={[fr.row, { borderBottomColor: border }, isAr && { flexDirection: "row-reverse" }]}>
      <View style={fr.labelCol}>
        <Text style={[fr.lbl, { color: sub }, isAr && { textAlign: "right" }]}>{label}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.2)"}
        keyboardType={keyboardType}
        style={[fr.input, { color: textCol }, isAr && { textAlign: "right" }]}
        autoCorrect={false}
      />
    </View>
  );
}

const fr = StyleSheet.create({
  row:      { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  labelCol: { width: 130 },
  lbl:      { fontFamily: "Cairo_500Medium", fontSize: 13 },
  input:    { flex: 1, fontFamily: "Cairo_500Medium", fontSize: 15, paddingVertical: 0 },
});

export default function AddressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, updateProfile } = useAuth();
  const { resolvedScheme } = useTheme();
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const isDark = resolvedScheme === "dark";
  const bg      = isDark ? "#0A0A0A" : "#FFFFFF";
  const textCol = isDark ? "#FFFFFF" : "#111111";
  const sub     = isDark ? "rgba(255,255,255,0.38)" : "#888888";
  const divider = isDark ? "#1A1A1A" : "#EBEBEB";
  const topPad  = Platform.OS === "web" ? 0 : insets.top;
  const botPad  = Platform.OS === "web" ? 0 : insets.bottom;

  const [addr, setAddr] = useState({
    name:     `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim(),
    phone:    user?.phone ?? "",
    city:     user?.address?.city ?? "",
    district: user?.address?.district ?? "",
  });
  const [saving, setSaving]             = useState(false);
  const [zones, setZones]               = useState<ShippingZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<ShippingZone | null>(null);
  const [showPicker, setShowPicker]     = useState(false);

  useEffect(() => {
    fetchShippingZones().then(setZones).catch(() => {});
  }, []);

  useEffect(() => {
    if (!zones.length || !addr.city) return;
    const z = zones.find((zo) => zo.governorate === addr.city || zo.governorateAr === addr.city);
    if (!z) return;
    if (!selectedZone) setSelectedZone(z);
    const ar = z.governorateAr || z.governorate;
    if (addr.city !== ar) setAddr((a) => ({ ...a, city: ar }));
  }, [zones, addr.city]);

  const set = (key: keyof typeof addr) => (val: string) =>
    setAddr((a) => ({ ...a, [key]: val }));

  const handleSave = async () => {
    if (!addr.name.trim())     { Alert.alert(isAr ? "مطلوب" : "Required", isAr ? "يرجى إدخال اسمك" : "Please enter your name"); return; }
    if (!addr.phone.trim())    { Alert.alert(isAr ? "مطلوب" : "Required", isAr ? "يرجى إدخال رقم هاتفك" : "Please enter your phone"); return; }
    if (!addr.city.trim())     { Alert.alert(isAr ? "مطلوب" : "Required", isAr ? "يرجى اختيار المحافظة" : "Please select your governorate"); return; }
    if (!addr.district.trim()) { Alert.alert(isAr ? "مطلوب" : "Required", isAr ? "يرجى إدخال المنطقة" : "Please enter your district"); return; }

    setSaving(true);
    try {
      const parts     = addr.name.trim().split(" ");
      const firstName = parts[0] || addr.name.trim();
      const lastName  = parts.slice(1).join(" ");
      await updateProfile({
        firstName,
        lastName,
        phone: addr.phone.trim(),
        address: {
          city:     addr.city.trim(),
          district: addr.district.trim(),
          street:   user?.address?.street ?? "",
        },
      });
      router.back();
    } catch (e: any) {
      Alert.alert(
        isAr ? "خطأ" : "Error",
        e?.message || (isAr ? "تعذّر حفظ العنوان" : "Could not save address. Please try again."),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <SeoHead page="address" noIndex />
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: divider }]}>
        <GlassBackButton onPress={() => router.back()} />
        <Text style={[styles.title, { color: textCol }]}>
          {isAr ? "عنواني" : "MY ADDRESS"}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 100 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
      >
        {/* Hint */}
        <Text style={[styles.hint, { color: sub }, isAr && { textAlign: "right", paddingHorizontal: 16 }]}>
          {isAr
            ? "يتم ملء هذه المعلومات تلقائياً عند إتمام الطلب."
            : "Saved to your account and pre-filled automatically at checkout."}
        </Text>

        <View style={{ borderTopWidth: 1, borderTopColor: divider }}>
          {/* Name */}
          <FieldRow
            label={isAr ? "الاسم" : "Full Name"}
            value={addr.name}
            onChangeText={set("name")}
            placeholder={isAr ? "محمد عبدالكريم" : "Ahmed Al-Rashidi"}
            textCol={textCol} sub={sub} isDark={isDark} isAr={isAr}
          />

          {/* Phone */}
          <FieldRow
            label={isAr ? "رقم تلفون أساسي" : "Primary Phone"}
            value={addr.phone}
            onChangeText={set("phone")}
            placeholder="+964 770 000 0000"
            keyboardType="phone-pad"
            textCol={textCol} sub={sub} isDark={isDark} isAr={isAr}
          />

          {/* Governorate picker */}
          <Pressable
            style={[styles.govRow, { borderBottomColor: divider }, isAr && { flexDirection: "row-reverse" }]}
            onPress={() => setShowPicker((v) => !v)}
          >
            <View style={[styles.govLabelCol, isAr && { alignItems: "flex-end" }]}>
              <Text style={[styles.govLbl, { color: sub }]}>
                {isAr ? "المحافظة" : "Governorate"}
              </Text>
            </View>
            <Text style={[
              styles.govVal,
              { color: addr.city ? textCol : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)") },
              isAr && { textAlign: "right" },
            ]}>
              {addr.city || (isAr ? "اختر المحافظة..." : "Select governorate...")}
            </Text>
            <Feather name={showPicker ? "chevron-up" : "chevron-down"} size={16} color={sub} />
          </Pressable>

          {showPicker && (
            <View style={[styles.dropdown, { backgroundColor: isDark ? "#111" : "#FAFAFA", borderColor: divider }]}>
              <ScrollView style={{ maxHeight: 224 }} showsVerticalScrollIndicator={false} bounces={false} nestedScrollEnabled>
                {zones.map((z, idx) => {
                  const label    = isAr ? (z.governorateAr || z.governorate) : z.governorate;
                  const selected = selectedZone?.governorate === z.governorate;
                  return (
                    <Pressable
                      key={z.governorate}
                      style={({ pressed }) => [
                        styles.dropRow,
                        isAr && { flexDirection: "row-reverse" },
                        idx < zones.length - 1 && { borderBottomWidth: 1, borderBottomColor: divider },
                        pressed && { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" },
                      ]}
                      onPress={() => {
                        setSelectedZone(z);
                        setAddr((a) => ({ ...a, city: z.governorateAr || z.governorate }));
                        setShowPicker(false);
                      }}
                    >
                      <Text style={[styles.dropLbl, { color: selected ? PRIMARY : textCol, fontWeight: selected ? "700" : "500" }]}>
                        {label}
                      </Text>
                      {selected && <Feather name="check" size={14} color={PRIMARY} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* District */}
          <FieldRow
            label={isAr ? "المنطقة / الحي" : "District / Area"}
            value={addr.district}
            onChangeText={set("district")}
            placeholder={isAr ? "المنصور" : "Al-Mansour"}
            textCol={textCol} sub={sub} isDark={isDark} isAr={isAr}
          />
        </View>

        {/* Save button */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [styles.saveBtn, { opacity: pressed || saving ? 0.8 : 1 }]}
            testID="btn-save-address"
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveTxt}>{isAr ? "حفظ العنوان" : "SAVE ADDRESS"}</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title:  { fontFamily: "Cairo_700Bold", fontSize: 15, letterSpacing: 1 },
  hint:   { fontFamily: "Cairo_400Regular", fontSize: 12.5, lineHeight: 18, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, color: "#888" },

  govRow:     { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  govLabelCol:{ width: 130 },
  govLbl:     { fontFamily: "Cairo_500Medium", fontSize: 13 },
  govVal:     { flex: 1, fontFamily: "Cairo_500Medium", fontSize: 15 },

  dropdown: { borderWidth: 1, marginHorizontal: 16, marginBottom: 4 },
  dropRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13 },
  dropLbl:  { fontFamily: "Cairo_500Medium", fontSize: 15 },

  saveBtn: { backgroundColor: PRIMARY, height: 52, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  saveTxt: { color: "#fff", fontFamily: "Cairo_700Bold", fontSize: 15, letterSpacing: 0.8 },
});
