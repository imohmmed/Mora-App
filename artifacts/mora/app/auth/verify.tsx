/**
 * OTP Verify Screen — 6-digit code sent via Firebase SMS.
 * Auto-focuses next box, auto-submits on 6th digit.
 * Resend countdown: 60 seconds.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { GlassBackButton } from "@/components/GlassBackButton";
import { SeoHead } from "@/components/SeoHead";
import { useAuth } from "@/context/AuthContext";
import { verifyOTP, sendPhoneOTP } from "@/lib/firebase";

const PRIMARY = "#0274C1";
const BOX_COUNT = 6;
const RESEND_SECS = 60;

export default function VerifyScreen() {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { phone, returnTo } = useLocalSearchParams<{ phone: string; returnTo?: string }>();
  const { loginWithPhone } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(BOX_COUNT).fill(""));
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [resend, setResend]     = useState(RESEND_SECS);
  const [resending, setResending] = useState(false);

  const refs = useRef<(TextInput | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (resend <= 0) return;
    const t = setTimeout(() => setResend((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resend]);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleVerify = useCallback(async (code: string) => {
    if (code.length < BOX_COUNT) return;
    Keyboard.dismiss();
    setLoading(true);
    setError("");
    try {
      const { uid, phone: verifiedPhone } = await verifyOTP(code);
      await loginWithPhone(verifiedPhone || phone, uid);
      router.replace(((returnTo as string) || "/account") as any);
    } catch (err: any) {
      setError(err.message ?? "رمز التحقق غير صحيح");
      setDigits(Array(BOX_COUNT).fill(""));
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }, [phone, returnTo, loginWithPhone, router]);

  // ── Digit input ──────────────────────────────────────────────────────────
  const handleDigit = (value: string, index: number) => {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];

    if (char) {
      next[index] = char;
      setDigits(next);
      setError("");
      if (index < BOX_COUNT - 1) {
        refs.current[index + 1]?.focus();
      } else {
        // Last digit — submit
        handleVerify(next.join(""));
      }
    } else {
      next[index] = "";
      setDigits(next);
      if (index > 0) refs.current[index - 1]?.focus();
    }
  };

  // Handle paste (user pastes full 6-digit code)
  const handlePaste = (text: string, index: number) => {
    const clean = text.replace(/\D/g, "").slice(0, BOX_COUNT);
    if (clean.length > 1) {
      const next = [...digits];
      for (let i = 0; i < clean.length; i++) next[i] = clean[i];
      setDigits(next);
      const focusIdx = Math.min(clean.length, BOX_COUNT - 1);
      refs.current[focusIdx]?.focus();
      if (clean.length === BOX_COUNT) handleVerify(clean);
    } else {
      handleDigit(text, index);
    }
  };

  // Backspace: clear current and move back
  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      refs.current[index - 1]?.focus();
    }
  };

  // ── Resend ───────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resend > 0 || resending) return;
    setResending(true);
    setError("");
    try {
      await sendPhoneOTP(phone);
      setResend(RESEND_SECS);
      setDigits(Array(BOX_COUNT).fill(""));
      refs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message ?? "فشل إعادة الإرسال");
    } finally {
      setResending(false);
    }
  };

  const code = digits.join("");
  const topPad = Platform.OS === "web" ? 0 : insets.top;

  // ── colours ──────────────────────────────────────────────────────────────
  const bg      = isDark ? "#0D0D0D" : "#FFFFFF";
  const fg      = isDark ? "#FFFFFF" : "#000000";
  const muted   = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.44)";
  const border  = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)";
  const boxBg   = isDark ? "rgba(255,255,255,0.06)" : "#F8F8F8";
  const activBg = isDark ? "rgba(2,116,193,0.20)"  : "rgba(2,116,193,0.08)";

  return (
    <View style={[styles.root, { backgroundColor: bg, paddingTop: topPad }]}>
      <SeoHead page="verify" noIndex />
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <GlassBackButton onPress={() => router.back()} />
      </View>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Feather name="message-circle" size={40} color={PRIMARY} />
        </View>

        <Text style={[styles.title, { color: fg }]}>رمز التحقق</Text>
        <Text style={[styles.subtitle, { color: muted }]}>
          أرسلنا رمزاً مكوناً من 6 أرقام إلى
        </Text>
        <Text style={[styles.phoneDisplay, { color: fg }]}>{phone}</Text>

        {/* ── OTP Boxes ──────────────────────────────────────────────── */}
        <View style={styles.boxesRow}>
          {Array.from({ length: BOX_COUNT }).map((_, i) => {
            const filled = !!digits[i];
            return (
              <TextInput
                key={i}
                ref={(r) => { refs.current[i] = r; }}
                style={[
                  styles.box,
                  {
                    backgroundColor: filled ? activBg : boxBg,
                    borderColor: filled ? PRIMARY : border,
                    color: fg,
                  },
                ]}
                value={digits[i]}
                onChangeText={(t) => handlePaste(t, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={6}
                selectTextOnFocus
                caretHidden
              />
            );
          })}
        </View>

        {/* ── Error ──────────────────────────────────────────────────── */}
        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
            <Feather name="alert-circle" size={14} color="#DC2626" />
            <Text style={styles.errorTxt}>{error}</Text>
          </View>
        )}

        {/* ── Verify button ──────────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [
            styles.verifyBtn,
            {
              backgroundColor: code.length === BOX_COUNT ? PRIMARY : (isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"),
              opacity: pressed || loading ? 0.82 : 1,
            },
          ]}
          onPress={() => handleVerify(code)}
          disabled={loading || code.length < BOX_COUNT}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={[styles.verifyTxt, { color: code.length === BOX_COUNT ? "#fff" : muted }]}>
                تأكيد
              </Text>
          }
        </Pressable>

        {/* ── Resend ─────────────────────────────────────────────────── */}
        <View style={styles.resendRow}>
          <Text style={[styles.resendLabel, { color: muted }]}>لم تستلم الرمز؟</Text>
          {resend > 0 ? (
            <Text style={[styles.resendTimer, { color: PRIMARY }]}>
              أعد الإرسال بعد {resend}s
            </Text>
          ) : (
            <Pressable onPress={handleResend} disabled={resending}>
              {resending
                ? <ActivityIndicator color={PRIMARY} size="small" />
                : <Text style={[styles.resendLink, { color: PRIMARY }]}>
                    أعد الإرسال
                  </Text>
              }
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(2,116,193,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontFamily: "Cairo_700Bold",
    fontSize: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    marginBottom: 4,
    textAlign: "center",
  },
  phoneDisplay: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 15,
    marginBottom: 36,
    letterSpacing: 1,
  },

  /* ── OTP boxes ── */
  boxesRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  box: {
    width: 46,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    textAlign: "center",
    fontSize: 22,
    fontFamily: "Cairo_700Bold",
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
    width: "100%",
  },
  errorTxt: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    color: "#DC2626",
    flex: 1,
  },

  /* ── Verify button ── */
  verifyBtn: {
    width: "100%",
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  verifyTxt: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
    letterSpacing: 0.5,
  },

  /* ── Resend ── */
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resendLabel: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
  },
  resendTimer: {
    fontFamily: "Cairo_500Medium",
    fontSize: 13,
  },
  resendLink: {
    fontFamily: "Cairo_600SemiBold",
    fontSize: 13,
  },
});
