/**
 * Auth Screen — Google + Apple sign-in via popup (no redirect).
 */

import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage, LANGUAGES } from "@/context/LanguageContext";
import { AppleActionSheet } from "@/components/AppleActionSheet";
import {
  isFirebaseConfigured,
  signInWithGoogle,
  signInWithApple,
  warmUpFirebase,
} from "@/lib/firebase";
import {
  nativeAppleSignIn,
  nativeGoogleSignIn,
  isAppleAvailable,
  isGoogleConfigured,
} from "@/lib/nativeAuth";

const PRIMARY = "#0274C1";

const T = {
  en: {
    protected:   "Your data is protected.",
    google:      "Continue with Google",
    apple:       "Continue with Apple",
    termsPrefix: "By continuing, you agree to our ",
    privacy:     "Privacy Policy",
    and:         " and ",
    terms:       "Terms & Conditions",
    errNoFB:     "Firebase not configured yet.",
    errGoogle:   "Google sign-in failed",
    errApple:    "Apple sign-in failed",
  },
  ar: {
    protected:   "بياناتك محمية",
    google:      "تسجيل الدخول عبر Google",
    apple:       "تسجيل الدخول عبر Apple",
    termsPrefix: "بالمتابعة توافق على ",
    privacy:     "سياسة الخصوصية",
    and:         " و ",
    terms:       "الشروط والأحكام",
    errNoFB:     "Firebase غير مهيأ بعد.",
    errGoogle:   "فشل تسجيل الدخول عبر Google",
    errApple:    "فشل تسجيل الدخول عبر Apple",
  },
} as const;

export default function AuthScreen() {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { loginWithSocial } = useAuth();
  const { lang, language, setLang } = useLanguage();

  const t = T[lang] ?? T.en;

  const [gLoading, setGLoading] = useState(false);
  const [aLoading, setALoading] = useState(false);
  const [error, setError]       = useState("");
  const [showLangPicker, setShowLangPicker] = useState(false);

  const IS_NATIVE_IOS = Platform.OS === "ios";
  const configured    = isFirebaseConfigured();

  // Pre-load Firebase modules on screen mount (web only — prevents popup-blocked on first tap)
  useEffect(() => { if (!IS_NATIVE_IOS) warmUpFirebase(); }, []);

  const bg    = isDark ? "#0D0D0D" : "#FFFFFF";
  const fg    = isDark ? "#FFFFFF" : "#000000";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.44)";

  const afterSignIn = async (user: { uid: string; email: string; name: string }, errMsg: string) => {
    try {
      await loginWithSocial(user.uid, user.name, user.email);
      router.replace(((returnTo || "/(tabs)/account") as any));
    } catch (err: any) {
      setError(err.message ?? errMsg);
    }
  };

  const handleGoogle = async () => {
    setError("");
    // ── Native iOS: use expo-auth-session + PKCE (no Firebase SDK needed) ──
    if (IS_NATIVE_IOS) {
      if (!isGoogleConfigured()) {
        setError("Google sign-in setup required — EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID not set.");
        return;
      }
      try {
        setGLoading(true);
        const user = await nativeGoogleSignIn();
        await afterSignIn(user, t.errGoogle);
      } catch (err: any) {
        if (err.message !== "CANCELLED") setError(err.message ?? t.errGoogle);
      } finally {
        setGLoading(false);
      }
      return;
    }
    // ── Web: Firebase popup ────────────────────────────────────────────────
    // setGLoading(true) must come BEFORE the await so the button is disabled
    // immediately — otherwise a second tap fires while the popup is open and
    // causes auth/cancelled-popup-request.
    if (!configured) { setError(t.errNoFB); return; }
    try {
      setGLoading(true);
      const user = await signInWithGoogle();
      await afterSignIn(user, t.errGoogle);
    } catch (err: any) {
      setError(err.message ?? t.errGoogle);
    } finally {
      setGLoading(false);
    }
  };

  const handleApple = async () => {
    setError("");
    // ── Native iOS: expo-apple-authentication (native dialog, no Firebase) ──
    if (IS_NATIVE_IOS) {
      try {
        setALoading(true);
        const user = await nativeAppleSignIn();
        await afterSignIn(user, t.errApple);
      } catch (err: any) {
        // AppleAuthenticationFullName only available first sign-in; not an error
        const msg = err?.code === "ERR_REQUEST_CANCELED" ? "" : (err.message ?? t.errApple);
        if (msg) setError(msg);
      } finally {
        setALoading(false);
      }
      return;
    }
    // ── Web: Firebase popup (Apple) ────────────────────────────────────────
    // setALoading(true) must come BEFORE the await — same reason as Google above:
    // prevents double-tap from sending two simultaneous popup requests, which
    // Firebase rejects with auth/cancelled-popup-request.
    if (!configured) { setError(t.errNoFB); return; }
    try {
      setALoading(true);
      const user = await signInWithApple();
      await afterSignIn(user, t.errApple);
    } catch (err: any) {
      // Ignore user-cancelled Apple sign-in (sheet dismissed)
      if (err?.code !== "auth/popup-closed-by-user" && err?.code !== "auth/cancelled-popup-request") {
        setError(err.message ?? t.errApple);
      }
    } finally {
      setALoading(false);
    }
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
      <Stack.Screen options={{ title: "", headerShown: false }} />

      <Pressable
        style={[styles.closeBtn, { top: topPad + 4 }]}
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/(tabs)" as any);
        }}
      >
        <Feather name="x" size={22} color={fg} />
      </Pressable>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 48, paddingBottom: botPad + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ── */}
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

          {/* ── Error ── */}
          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
              <Feather name="alert-circle" size={14} color="#DC2626" />
              <Text style={styles.errorTxt}>{error}</Text>
            </View>
          )}

          {/* ── Google ── */}
          <Pressable
            style={({ pressed }) => [
              styles.socialBtn,
              {
                borderColor: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.18)",
                backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#FFFFFF",
                opacity: pressed || gLoading ? 0.75 : 1,
              },
            ]}
            onPress={handleGoogle}
            disabled={gLoading}
          >
            {gLoading
              ? <ActivityIndicator color={isDark ? "#fff" : PRIMARY} size="small" />
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
              {
                borderColor: isDark ? "rgba(255,255,255,0.55)" : "#000",
                opacity: pressed || aLoading ? 0.75 : 1,
              },
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

          {/* ── Language ── */}
          <Pressable
            style={[styles.langBtn, { borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)" }]}
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
  root:    { flex: 1 },
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

  logoWrap:     { alignItems: "center", marginBottom: 48 },
  logoImg:      { width: 160, height: 60 },
  protectedRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  protectedTxt: { fontFamily: "Inter_500Medium", fontSize: 13 },

  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 16,
  },
  errorTxt: { fontFamily: "Inter_400Regular", fontSize: 13, color: "#DC2626", flex: 1 },

  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  appleBtn:  { backgroundColor: "#000" },
  socialTxt: { fontFamily: "Inter_600SemiBold", fontSize: 15 },

  termsTxt: {
    fontFamily: "Inter_400Regular", fontSize: 11,
    textAlign: "center", lineHeight: 18, marginTop: 8, marginBottom: 24,
  },

  langBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, paddingHorizontal: 18,
    borderRadius: 20, alignSelf: "center", borderWidth: 1,
    marginTop: 4, marginBottom: 8,
  },
  langTxt: { fontFamily: "Inter_500Medium", fontSize: 13 },
});
