/**
 * Auth Screen — Phone OTP + Google + Apple sign-in.
 * Single unified screen for both sign-in and registration.
 * Phone: fixed +964 (Iraq) prefix. Supports en/ar via LanguageContext.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { useLanguage, LANGUAGES } from "@/context/LanguageContext";
import { AppleActionSheet } from "@/components/AppleActionSheet";
import {
  isFirebaseConfigured,
  normalizeIraqiPhone,
  isValidIraqiPhone,
  sendPhoneOTP,
  signInWithGoogle,
  signInWithApple,
} from "@/lib/firebase";

const PRIMARY = "#0274C1";

// ── Translations ─────────────────────────────────────────────────────────────
const T = {
  en: {
    protected:    "Your data is protected.",
    phoneLabel:   "Phone Number",
    phonePH:      "07766699669",
    phoneHint:    "e.g. 07766699669 or 7766699669",
    continueBtn:  "Continue",
    or:           "Or",
    google:       "Continue with Google",
    apple:        "Continue with Apple",
    termsPrefix:  "By continuing, you agree to our ",
    privacy:      "Privacy Policy",
    and:          " and ",
    terms:        "Terms & Conditions",
    errInvalid:   "Enter a valid Iraqi number — e.g. 07766699669",
    errNoFB:      "Firebase not configured yet.",
    errSend:      "Failed to send code",
    errGoogle:    "Google sign-in failed",
    errApple:     "Apple sign-in failed",
  },
  ar: {
    protected:    "بياناتك محمية",
    phoneLabel:   "رقم الهاتف",
    phonePH:      "07766699669",
    phoneHint:    "مثال: 07766699669 أو 7766699669",
    continueBtn:  "متابعة",
    or:           "أو",
    google:       "تسجيل الدخول عبر Google",
    apple:        "تسجيل الدخول عبر Apple",
    termsPrefix:  "بالمتابعة توافق على ",
    privacy:      "سياسة الخصوصية",
    and:          " و ",
    terms:        "الشروط والأحكام",
    errInvalid:   "أدخل رقماً عراقياً صحيحاً — مثال: 07766699669",
    errNoFB:      "Firebase غير مهيأ بعد.",
    errSend:      "فشل إرسال الرمز",
    errGoogle:    "فشل تسجيل الدخول عبر Google",
    errApple:     "فشل تسجيل الدخول عبر Apple",
  },
} as const;

export default function AuthScreen() {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { loginWithSocial } = useAuth();
  const { lang, language, setLang } = useLanguage();

  const t = T[lang] ?? T.en;
  const isRTL = lang === "ar";

  const [phone, setPhone]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [aLoading, setALoading] = useState(false);
  const [error, setError]       = useState("");
  const [showLangPicker, setShowLangPicker] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const configured = isFirebaseConfigured();

  // Hide "auth" from browser title bar on web
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.title = "Mora";
    }
  }, []);

  const bg       = isDark ? "#0D0D0D" : "#FFFFFF";
  const fg       = isDark ? "#FFFFFF" : "#000000";
  const muted    = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.44)";
  const border   = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.14)";
  const inputBg  = isDark ? "rgba(255,255,255,0.06)" : "#F8F8F8";
  const divColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";

  const e164    = normalizeIraqiPhone(phone);
  const canCont = isValidIraqiPhone(e164);

  const handleContinue = async () => {
    if (!canCont) { setError(t.errInvalid); return; }
    if (!configured) { setError(t.errNoFB); return; }
    setLoading(true); setError("");
    try {
      await sendPhoneOTP(e164);
      router.push({ pathname: "/auth/verify", params: { phone: e164 } });
    } catch (err: any) {
      setError(err.message ?? t.errSend);
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    if (!configured) { setError(t.errNoFB); return; }
    setGLoading(true); setError("");
    try {
      const { uid, email, name } = await signInWithGoogle();
      await loginWithSocial(uid, name, email);
      router.replace("/(tabs)/account");
    } catch (err: any) {
      setError(err.message ?? t.errGoogle);
    } finally { setGLoading(false); }
  };

  const handleApple = async () => {
    if (!configured) { setError(t.errNoFB); return; }
    setALoading(true); setError("");
    try {
      const { uid, email, name } = await signInWithApple();
      await loginWithSocial(uid, name, email);
      router.replace("/(tabs)/account");
    } catch (err: any) {
      setError(err.message ?? t.errApple);
    } finally { setALoading(false); }
  };

  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const botPad = Platform.OS === "web" ? 0 : insets.bottom;

  const langOptions = LANGUAGES.map((l) => ({
    value: l.code,
    label: l.nativeLabel,
    sublabel: l.label,
    flag: l.flag,
  }));

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {/* ── Close (X) only — no back arrow ── */}
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
            { paddingTop: topPad + 60, paddingBottom: botPad + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Mora wordmark logo ── */}
          <View style={styles.logoWrap}>
            <Image
              source={require("@/assets/images/mora-wordmark.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
            <View style={styles.protectedRow}>
              <Feather name="lock" size={13} color="#27AE60" />
              <Text style={[styles.protectedTxt, { color: "#27AE60" }]}>
                {t.protected}
              </Text>
            </View>
          </View>

          {/* ── Phone input ── */}
          <View style={styles.section}>
            <Pressable
              style={[styles.phoneRow, { backgroundColor: inputBg, borderColor: border }]}
              onPress={() => inputRef.current?.focus()}
            >
              <View style={[styles.prefixWrap, { borderRightColor: border }]}>
                <Text style={styles.flagEmoji}>🇮🇶</Text>
                <Text style={[styles.prefixText, { color: fg }]}>+964</Text>
              </View>
              <TextInput
                ref={inputRef}
                style={[styles.phoneInput, { color: fg, textAlign: isRTL ? "right" : "left" }]}
                value={phone}
                onChangeText={(v) => { setPhone(v); setError(""); }}
                placeholder={t.phonePH}
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
            <Text style={[styles.hintTxt, { color: muted, textAlign: isRTL ? "right" : "left" }]}>
              {t.phoneHint}
            </Text>
          </View>

          {/* ── Error ── */}
          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
              <Feather name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.errorTxt}>{error}</Text>
            </View>
          )}

          {/* ── Continue ── */}
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
                  {t.continueBtn}
                </Text>
            }
          </Pressable>

          {/* ── Divider ── */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: divColor }]} />
            <Text style={[styles.dividerTxt, { color: muted }]}>{t.or}</Text>
            <View style={[styles.dividerLine, { backgroundColor: divColor }]} />
          </View>

          {/* ── Google ── */}
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
                  <Text style={[styles.socialTxt, { color: fg }]}>{t.google}</Text>
                </>
            }
          </Pressable>

          {/* ── Apple ── */}
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
                  <Text style={[styles.socialTxt, { color: "#fff" }]}>{t.apple}</Text>
                </>
            }
          </Pressable>

          {/* ── Terms ── */}
          <Text style={[styles.termsTxt, { color: muted }]}>
            {t.termsPrefix}
            <Text style={{ color: PRIMARY }}>{t.privacy}</Text>
            {t.and}
            <Text style={{ color: PRIMARY }}>{t.terms}</Text>
          </Text>

          {/* ── Language selector ── */}
          <Pressable
            style={[styles.langBtn, { borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }]}
            onPress={() => setShowLangPicker(true)}
          >
            <Feather name="globe" size={14} color={muted} />
            <Text style={[styles.langTxt, { color: muted }]}>
              {language.flag} {language.nativeLabel}
            </Text>
            <Feather name="chevron-down" size={13} color={muted} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Language picker ── */}
      <AppleActionSheet
        visible={showLangPicker}
        title="Choose Language"
        options={langOptions}
        selectedValue={lang}
        onSelect={(val) => { setLang(val as any); setShowLangPicker(false); }}
        onCancel={() => setShowLangPicker(false)}
      />
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
  scroll: { paddingHorizontal: 24, alignItems: "stretch" },

  /* ── Logo ── */
  logoWrap: { alignItems: "center", marginBottom: 36 },
  logoImg:  { width: 160, height: 60 },
  protectedRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  protectedTxt: { fontFamily: "Inter_500Medium", fontSize: 13 },

  /* ── Phone ── */
  section:   { marginBottom: 20 },
  phoneRow:  {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderRadius: 10, overflow: "hidden", height: 52,
  },
  prefixWrap: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, height: "100%", borderRightWidth: 1,
  },
  flagEmoji:  { fontSize: 20, lineHeight: 26 },
  prefixText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  phoneInput: { flex: 1, height: "100%", paddingHorizontal: 14, fontFamily: "Inter_400Regular", fontSize: 16 },
  hintTxt:    { fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 6 },

  /* ── Error ── */
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 16,
  },
  errorTxt: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#DC2626", flex: 1 },

  /* ── Continue ── */
  continueBtn: { height: 52, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  continueTxt: { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 0.5 },

  /* ── Divider ── */
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerTxt:  { fontFamily: "Inter_500Medium", fontSize: 13 },

  /* ── Social ── */
  socialBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 12, height: 52, borderRadius: 10, borderWidth: 1.5, marginBottom: 12,
  },
  appleBtn:  { backgroundColor: "#000", borderColor: "#000" },
  socialTxt: { fontFamily: "Inter_600SemiBold", fontSize: 14 },

  /* ── Terms ── */
  termsTxt: {
    fontFamily: "Inter_400Regular", fontSize: 11,
    textAlign: "center", lineHeight: 18, marginTop: 8, marginBottom: 20,
  },

  /* ── Language ── */
  langBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, paddingHorizontal: 18,
    borderRadius: 20, alignSelf: "center", borderWidth: 1,
    marginTop: 4, marginBottom: 8,
  },
  langTxt: { fontFamily: "Inter_500Medium", fontSize: 13 },
});
