import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useTheme, type ThemeMode } from "@/context/ThemeContext";
import { useLanguage, LANGUAGES } from "@/context/LanguageContext";
import { AppleActionSheet } from "@/components/AppleActionSheet";
import { GlassBackButton } from "@/components/GlassBackButton";
import { MoraLiveActivity } from "@/modules/MoraLiveActivity";
import { BlurView } from "expo-blur";
import { LiquidGlassBg, isIOS26Plus } from "@/components/LiquidGlassBg";

const PRIMARY = "#0274C1";

const useGlassSurface = Platform.OS !== "web";
const SURFACE_TINT_LIGHT = isIOS26Plus ? "rgba(235,245,255,0.1)" : "rgba(235,245,255,0.5)";
const SURFACE_TINT_DARK  = isIOS26Plus ? "rgba(28,28,30,0.14)"  : "rgba(28,28,30,0.5)";

function GlassBase({ isDark, intensity = 55 }: { isDark: boolean; intensity?: number }) {
  if (isIOS26Plus) return <LiquidGlassBg />;
  if (Platform.OS !== "web") {
    return (
      <BlurView
        style={StyleSheet.absoluteFill}
        intensity={intensity}
        tint={isDark ? "systemThinMaterialDark" : "systemThinMaterial"}
      />
    );
  }
  return null;
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode, setMode, resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const card = isDark ? "#1C1C1E" : "#EBF5FF";
  const bg   = isDark ? "#0A0A0A" : "#FFFFFF";
  const { lang, language, setLang } = useLanguage();
  const isAr = lang === "ar";
  const [showLangPicker, setShowLangPicker] = useState(false);
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const botPad = Platform.OS === "web" ? 0 : insets.bottom;

  const THEME_OPTIONS: { value: ThemeMode; labelEn: string; labelAr: string; icon: string }[] = [
    { value: "light",  labelEn: "Light",  labelAr: "فاتح",   icon: "sun" },
    { value: "dark",   labelEn: "Dark",   labelAr: "داكن",   icon: "moon" },
    { value: "system", labelEn: "System", labelAr: "النظام", icon: "smartphone" },
  ];

  const langOptions = LANGUAGES.map((l) => ({
    value: l.code,
    label: l.nativeLabel,
    sublabel: l.label,
    flag: l.flag,
  }));

  async function runLiveActivityDiagnostic() {
    const d = MoraLiveActivity.diagnose();
    if (!d.moduleLoaded) {
      Alert.alert(
        "Live Activity",
        "Native module NOT in this build (web, Expo Go, or an old build that predates the widget). Install a fresh native build to enable Live Activities.",
      );
      return;
    }
    const lines = [
      `iOS: ${d.iosVersion ?? "?"}`,
      `ActivityKit: ${d.activityKitAvailable ? "yes" : "no"}`,
      `Enabled in Settings: ${d.areActivitiesEnabled ? "YES" : "NO — turn ON in Settings → Mora"}`,
      `Push-to-start: ${d.pushToStartSupported ? "supported" : "needs iOS 17.2+"}`,
      `Active now: ${d.activeActivities ?? 0}`,
    ];
    const res = await MoraLiveActivity.startTestActivity();
    lines.push("", res.ok
      ? "✅ Test Live Activity started — check your Dynamic Island / Lock Screen."
      : `❌ Could not start: ${res.error ?? "unknown error"}`);
    Alert.alert("Live Activity Diagnostic", lines.join("\n"));
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* ── Header ── */}
      <View style={[styles.acctHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        {Platform.OS === "web" ? (
          <>
            <Pressable style={styles.flatIconBtn} onPress={() => router.back()}>
              <Feather name={isAr ? "chevron-right" : "chevron-left"} size={22} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.pageTitleWeb, { color: colors.foreground }, isAr && { textAlign: "right" }]}>
              {isAr ? "الإعدادات" : "SETTINGS"}
            </Text>
            <View style={{ width: 38 }} />
          </>
        ) : (
          <>
            <GlassBackButton onPress={() => router.back()} />
            <Text style={[styles.acctTitle, { color: colors.foreground }]}>
              {isAr ? "الإعدادات" : "SETTINGS"}
            </Text>
            <View style={{ width: 38 }} />
          </>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 80 }}
      >
        {/* ── Appearance ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }, isAr && { textAlign: "right" }]}>
            {isAr ? "المظهر" : "APPEARANCE"}
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: useGlassSurface ? "transparent" : card }, Platform.OS === "web" && { borderRadius: 0 }]}>
            {useGlassSurface && <GlassBase isDark={isDark} />}
            {useGlassSurface && (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? SURFACE_TINT_DARK : SURFACE_TINT_LIGHT }]} />
            )}
            <View style={[styles.themeRow, { borderBottomColor: colors.border }]}>
              {THEME_OPTIONS.map((opt) => {
                const active = mode === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setMode(opt.value)}
                    style={[
                      styles.themeOption,
                      {
                        backgroundColor: active ? PRIMARY : colors.secondary,
                        borderColor: active ? PRIMARY : colors.border,
                      },
                    ]}
                  >
                    <Feather name={opt.icon as any} size={17} color={active ? "#fff" : colors.foreground} />
                    <Text style={[styles.themeOptionLabel, { color: active ? "#fff" : colors.foreground }]}>
                      {isAr ? opt.labelAr : opt.labelEn}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Language ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }, isAr && { textAlign: "right" }]}>
            {isAr ? "اللغة" : "LANGUAGE"}
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: useGlassSurface ? "transparent" : card }, Platform.OS === "web" && { borderRadius: 0 }]}>
            {useGlassSurface && <GlassBase isDark={isDark} />}
            {useGlassSurface && (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? SURFACE_TINT_DARK : SURFACE_TINT_LIGHT }]} />
            )}
            <Pressable
              style={({ pressed }) => [
                styles.settingsRow,
                styles.lastRow,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.secondary },
                isAr && { flexDirection: "row-reverse" },
              ]}
              onPress={() => setShowLangPicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Select language"
            >
              {/* Icon + label — right in Arabic */}
              <View style={[styles.settingsLeft, isAr && { flexDirection: "row-reverse" }]}>
                <View style={[styles.settingsIcon, { backgroundColor: isDark ? "#1C1C1E" : "#EBF5FF" }]}>
                  <Feather name="globe" size={16} color={PRIMARY} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.foreground }]}>
                  {isAr ? "اللغة" : "Language"}
                </Text>
              </View>
              {/* Value + chevron — left in Arabic */}
              <View style={styles.settingsRight}>
                <Text style={[styles.settingsValue, { color: colors.mutedForeground }]}>
                  {language.flag} {language.nativeLabel}
                </Text>
                <Feather
                  name={isAr ? "chevron-left" : "chevron-right"}
                  size={16}
                  color={colors.mutedForeground}
                />
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── Apple-style language picker ── */}
        <AppleActionSheet
          visible={showLangPicker}
          title={isAr ? "اختر اللغة" : "Choose Language"}
          options={langOptions}
          selectedValue={lang}
          onSelect={(val) => {
            setLang(val as any);
            setShowLangPicker(false);
          }}
          onCancel={() => setShowLangPicker(false)}
        />

        {/* ── Information ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }, isAr && { textAlign: "right" }]}>
            {isAr ? "معلومات" : "INFORMATION"}
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: useGlassSurface ? "transparent" : card }, Platform.OS === "web" && { borderRadius: 0 }]}>
            {useGlassSurface && <GlassBase isDark={isDark} />}
            {useGlassSurface && (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? SURFACE_TINT_DARK : SURFACE_TINT_LIGHT }]} />
            )}

            {Platform.OS === "ios" && (
              <Pressable
                style={({ pressed }) => [
                  styles.settingsRow,
                  { borderBottomColor: colors.border },
                  pressed && { backgroundColor: colors.secondary },
                  isAr && { flexDirection: "row-reverse" },
                ]}
                onPress={runLiveActivityDiagnostic}
                accessibilityRole="button"
              >
                <View style={[styles.settingsLeft, isAr && { flexDirection: "row-reverse" }]}>
                  <View style={[styles.settingsIcon, { backgroundColor: isDark ? "#1C1C1E" : "#EBF5FF" }]}>
                    <Feather name="activity" size={16} color={PRIMARY} />
                  </View>
                  <Text style={[styles.settingsLabel, { color: colors.foreground }]}>
                    {isAr ? "اختبار Live Activity" : "Test Live Activity"}
                  </Text>
                </View>
                <Feather name={isAr ? "chevron-left" : "chevron-right"} size={16} color={colors.mutedForeground} />
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.settingsRow,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.secondary },
                isAr && { flexDirection: "row-reverse" },
              ]}
            >
              <View style={[styles.settingsLeft, isAr && { flexDirection: "row-reverse" }]}>
                <View style={[styles.settingsIcon, { backgroundColor: isDark ? "#1C1C1E" : "#EBF5FF" }]}>
                  <Feather name="info" size={16} color={PRIMARY} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.foreground }]}>
                  {isAr ? "عن مورا" : "About Mora"}
                </Text>
              </View>
              <Feather name={isAr ? "chevron-left" : "chevron-right"} size={16} color={colors.mutedForeground} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.settingsRow,
                styles.lastRow,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.secondary },
                isAr && { flexDirection: "row-reverse" },
              ]}
            >
              <View style={[styles.settingsLeft, isAr && { flexDirection: "row-reverse" }]}>
                <View style={[styles.settingsIcon, { backgroundColor: isDark ? "#1C1C1E" : "#EBF5FF" }]}>
                  <Feather name="shield" size={16} color={PRIMARY} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.foreground }]}>
                  {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
                </Text>
              </View>
              <Feather name={isAr ? "chevron-left" : "chevron-right"} size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>Mora v1.0.0</Text>
      </ScrollView>
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
  acctTitle:        { fontFamily: "Cairo_700Bold", fontSize: 15, letterSpacing: 1 },
  pageTitleWeb:     { fontFamily: "Cairo_900Black", fontSize: 22, fontWeight: "900", letterSpacing: -0.4, flex: 1 },
  flatIconBtn:      { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  themeRow:         { flexDirection: "row", padding: 12, gap: 10 },
  themeOption:      { flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12, borderRadius: 8, borderWidth: 1.5 },
  themeOptionLabel: { fontFamily: "Cairo_600SemiBold", fontSize: 12, letterSpacing: 0.3 },
  settingsRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  settingsLeft:     { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  settingsRight:    { flexDirection: "row", alignItems: "center", gap: 6 },
  settingsIcon:     { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  settingsLabel:    { fontFamily: "Cairo_500Medium", fontSize: 15 },
  settingsValue:    { fontFamily: "Cairo_400Regular", fontSize: 14 },
  section:          { paddingHorizontal: 16, marginBottom: 16, marginTop: 16 },
  sectionLabel:     { fontFamily: "Cairo_700Bold", fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  sectionCard:      { borderRadius: 16, overflow: "hidden" },
  lastRow:          { borderBottomWidth: 0 },
  version:          { textAlign: "center", fontFamily: "Cairo_400Regular", fontSize: 12, paddingBottom: 8 },
});
