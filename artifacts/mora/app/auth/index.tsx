/**
 * Auth Screen — Phone OTP + Google + Apple sign-in.
 *
 * Phone: fixed +964 (Iraq) prefix, accepts 07XXXXXXXXX or 7XXXXXXXXX.
 * After Continue: navigates to /auth/verify for OTP entry.
 * Google / Apple: uses Firebase popup auth → creates session via API.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import {
  isFirebaseConfigured,
  normalizeIraqiPhone,
  isValidIraqiPhone,
  sendPhoneOTP,
  signInWithGoogle,
  signInWithApple,
} from "@/lib/firebase";

const PRIMARY = "#0274C1";

export default function AuthScreen() {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loginWithSocial } = useAuth();

  const [phone, setPhone]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [aLoading, setALoading] = useState(false);
  const [error, setError]       = useState("");

  const inputRef = useRef<TextInput>(null);
  const configured = isFirebaseConfigured();

  // ── colours ──────────────────────────────────────────────────────────────
  const bg       = isDark ? "#0D0D0D" : "#FFFFFF";
  const fg       = isDark ? "#FFFFFF" : "#000000";
  const muted    = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.44)";
  const border   = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.14)";
  const inputBg  = isDark ? "rgba(255,255,255,0.06)" : "#F8F8F8";
  const divColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";

  // ── phone ─────────────────────────────────────────────────────────────────
  const e164     = normalizeIraqiPhone(phone);
  const canCont  = isValidIraqiPhone(e164);

  const handleContinue = async () => {
    if (!canCont) { setError("أدخل رقماً عراقياً صحيحاً — مثال: 07766699669"); return; }
    if (!configured) { setError("Firebase غير مهيأ بعد — سيتم التفعيل قريباً."); return; }
    setLoading(true);
    setError("");
    try {
      await sendPhoneOTP(e164);
      router.push({ pathname: "/auth/verify", params: { phone: e164 } });
    } catch (err: any) {
      setError(err.message ?? "فشل إرسال الرمز");
    } finally {
      setLoading(false);
    }
  };

  // ── Google ────────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    if (!configured) { setError("Firebase غير مهيأ بعد."); return; }
    setGLoading(true);
    setError("");
    try {
      const { uid, email, name } = await signInWithGoogle();
      await loginWithSocial(uid, name, email);
      router.replace("/(tabs)/account");
    } catch (err: any) {
      setError(err.message ?? "فشل تسجيل الدخول عبر Google");
    } finally {
      setGLoading(false);
    }
  };

  // ── Apple ─────────────────────────────────────────────────────────────────
  const handleApple = async () => {
    if (!configured) { setError("Firebase غير مهيأ بعد."); return; }
    setALoading(true);
    setError("");
    try {
      const { uid, email, name } = await signInWithApple();
      await loginWithSocial(uid, name, email);
      router.replace("/(tabs)/account");
    } catch (err: any) {
      setError(err.message ?? "فشل تسجيل الدخول عبر Apple");
    } finally {
      setALoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 0 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* ── Close button ─────────────────────────────────────────────────── */}
      <Pressable
        style={[styles.closeBtn, { top: topPad + 12 }]}
        onPress={() => router.back()}
      >
        <Feather name="x" size={22} color={fg} />
      </Pressable>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 60, paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ───────────────────────────────────────────────────── */}
          <View style={styles.logoWrap}>
            <Text style={[styles.logoText, { color: fg }]}>MORA</Text>
            <View style={styles.protectedRow}>
              <Feather name="lock" size={13} color="#27AE60" />
              <Text style={[styles.protectedTxt, { color: "#27AE60" }]}>
                بياناتك محمية
              </Text>
            </View>
          </View>

          {/* ── Phone input ────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={[styles.fieldLabel, { color: muted }]}>رقم الهاتف</Text>
            <Pressable
              style={[styles.phoneRow, { backgroundColor: inputBg, borderColor: border }]}
              onPress={() => inputRef.current?.focus()}
            >
              {/* Flag + country code (fixed) */}
              <View style={[styles.prefixWrap, { borderRightColor: border }]}>
                <Text style={styles.flagEmoji}>🇮🇶</Text>
                <Text style={[styles.prefixText, { color: fg }]}>+964</Text>
              </View>

              {/* Number input */}
              <TextInput
                ref={inputRef}
                style={[styles.phoneInput, { color: fg }]}
                value={phone}
                onChangeText={(t) => { setPhone(t); setError(""); }}
                placeholder="07766699669"
                placeholderTextColor={muted}
                keyboardType="phone-pad"
                maxLength={12}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
              />

              {phone.length > 0 && (
                <Pressable onPress={() => setPhone("")} style={{ padding: 8 }}>
                  <Feather name="x-circle" size={16} color={muted} />
                </Pressable>
              )}
            </Pressable>

            <Text style={[styles.hintTxt, { color: muted }]}>
              مثال: 07766699669 أو 7766699669
            </Text>
          </View>

          {/* ── Error ──────────────────────────────────────────────────── */}
          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
              <Feather name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.errorTxt}>{error}</Text>
            </View>
          )}

          {/* ── CONTINUE ───────────────────────────────────────────────── */}
          <Pressable
            style={({ pressed }) => [
              styles.continueBtn,
              {
                backgroundColor: canCont ? PRIMARY : (isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"),
                opacity: pressed || loading ? 0.82 : 1,
              },
            ]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={[styles.continueTxt, { color: canCont ? "#fff" : muted }]}>
                  متابعة
                </Text>
            }
          </Pressable>

          {/* ── Divider ────────────────────────────────────────────────── */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: divColor }]} />
            <Text style={[styles.dividerTxt, { color: muted }]}>أو</Text>
            <View style={[styles.dividerLine, { backgroundColor: divColor }]} />
          </View>

          {/* ── Google ─────────────────────────────────────────────────── */}
          <Pressable
            style={({ pressed }) => [
              styles.socialBtn,
              { borderColor: border, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#fff", opacity: pressed || gLoading ? 0.78 : 1 },
            ]}
            onPress={handleGoogle}
            disabled={gLoading}
          >
            {gLoading
              ? <ActivityIndicator color={PRIMARY} size="small" />
              : <>
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                  <Text style={[styles.socialTxt, { color: fg }]}>
                    تسجيل الدخول عبر Google
                  </Text>
                </>
            }
          </Pressable>

          {/* ── Apple ──────────────────────────────────────────────────── */}
          <Pressable
            style={({ pressed }) => [
              styles.socialBtn,
              styles.appleBtn,
              { opacity: pressed || aLoading ? 0.78 : 1 },
            ]}
            onPress={handleApple}
            disabled={aLoading}
          >
            {aLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="logo-apple" size={22} color="#fff" />
                  <Text style={[styles.socialTxt, { color: "#fff" }]}>
                    تسجيل الدخول عبر Apple
                  </Text>
                </>
            }
          </Pressable>

          {/* ── Terms ──────────────────────────────────────────────────── */}
          <Text style={[styles.termsTxt, { color: muted }]}>
            بالمتابعة توافق على{" "}
            <Text style={{ color: PRIMARY }}>سياسة الخصوصية</Text>
            {" "}و{" "}
            <Text style={{ color: PRIMARY }}>الشروط والأحكام</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  closeBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 24,
    alignItems: "stretch",
  },

  /* ── Logo ── */
  logoWrap: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoText: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    letterSpacing: 6,
    marginBottom: 8,
  },
  protectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  protectedTxt: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },

  /* ── Phone input ── */
  section: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 10,
    overflow: "hidden",
    height: 52,
  },
  prefixWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: "100%",
    borderRightWidth: 1,
  },
  flagEmoji: {
    fontSize: 20,
    lineHeight: 26,
  },
  prefixText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  phoneInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  hintTxt: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 6,
    textAlign: "right",
  },

  /* ── Error ── */
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorTxt: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#DC2626",
    flex: 1,
  },

  /* ── CONTINUE ── */
  continueBtn: {
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  continueTxt: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 0.5,
  },

  /* ── Divider ── */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerTxt: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },

  /* ── Social buttons ── */
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  appleBtn: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  socialTxt: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },

  /* ── Terms ── */
  termsTxt: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 16,
  },
});
