import React, { useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { GlassBackButton } from "@/components/GlassBackButton";

const PRIMARY = "#0274C1";

export default function AddressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateProfile } = useAuth();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const card = isDark ? "#1C1C1E" : "#EBF5FF";
  const bg = isDark ? "#0A0A0A" : "#FFFFFF";
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const botPad = Platform.OS === "web" ? 0 : insets.bottom;

  const [addr, setAddr] = useState({
    city: user?.address?.city ?? "",
    district: user?.address?.district ?? "",
    street: user?.address?.street ?? "",
    phone: user?.phone ?? "",
  });
  const [savingAddr, setSavingAddr] = useState(false);

  const handleSaveAddress = async () => {
    setSavingAddr(true);
    try {
      await updateProfile({
        phone: addr.phone.trim(),
        address: { city: addr.city.trim(), district: addr.district.trim(), street: addr.street.trim() },
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save address. Please try again.");
    } finally {
      setSavingAddr(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.acctHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <GlassBackButton onPress={() => router.back()} />
        <Text style={[styles.acctTitle, { color: colors.foreground }]}>MY ADDRESS</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: botPad + 80, gap: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.addrHint, { color: colors.mutedForeground }]}>
            Saved to your account and filled in automatically at checkout.
          </Text>

          {([
            { key: "city", label: "City / Governorate", placeholder: "بغداد", kb: "default" as const },
            { key: "district", label: "District / Area", placeholder: "Al-Mansour", kb: "default" as const },
            { key: "street", label: "Street (optional)", placeholder: "Street 14, Bldg 3", kb: "default" as const },
            { key: "phone", label: "Phone", placeholder: "+964 770 000 0000", kb: "phone-pad" as const },
          ]).map((f) => (
            <View key={f.key} style={[styles.addrField, { backgroundColor: card }]}>
              <Text style={[styles.addrLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
              <TextInput
                value={(addr as Record<string, string>)[f.key]}
                onChangeText={(t) => setAddr((a) => ({ ...a, [f.key]: t }))}
                placeholder={f.placeholder}
                placeholderTextColor={isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.28)"}
                keyboardType={f.kb}
                style={[styles.addrInput, { color: colors.foreground }]}
              />
            </View>
          ))}

          <Pressable
            onPress={handleSaveAddress}
            disabled={savingAddr}
            style={({ pressed }) => [styles.addrSaveBtn, { opacity: pressed || savingAddr ? 0.8 : 1 }]}
            testID="btn-save-address"
          >
            {savingAddr
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.addrSaveTxt}>SAVE ADDRESS</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  acctHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  acctTitle: { fontFamily: "Cairo_700Bold", fontSize: 15, letterSpacing: 1 },
  addrHint: { fontFamily: "Cairo_400Regular", fontSize: 12.5, lineHeight: 18, marginBottom: 4, paddingHorizontal: 2 },
  addrField: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  addrLabel: { fontFamily: "Cairo_500Medium", fontSize: 11, letterSpacing: 0.4, marginBottom: 4 },
  addrInput: { fontFamily: "Cairo_500Medium", fontSize: 15, paddingVertical: 2 },
  addrSaveBtn: { backgroundColor: PRIMARY, height: 52, borderRadius: 50, alignItems: "center", justifyContent: "center", marginTop: 8 },
  addrSaveTxt: { color: "#fff", fontFamily: "Cairo_700Bold", fontSize: 15, letterSpacing: 0.8 },
});
