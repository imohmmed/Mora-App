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

const PRIMARY = "#0274C1";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { mode, setMode, resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const card = isDark ? "#1C1C1E" : "#EBF5FF";
  const bg = isDark ? "#0A0A0A" : "#FFFFFF";
  const { lang, language, setLang } = useLanguage();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const botPad = Platform.OS === "web" ? 0 : insets.bottom;

  const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
    { value: "light", label: "Light", icon: "sun" },
    { value: "dark", label: "Dark", icon: "moon" },
    { value: "system", label: "System", icon: "smartphone" },
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
      <View style={[styles.acctHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <GlassBackButton onPress={() => router.back()} />
        <Text style={[styles.acctTitle, { color: colors.foreground }]}>SETTINGS</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 80 }}
      >
        {/* ── Appearance ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>APPEARANCE</Text>
          <View style={[styles.sectionCard, { backgroundColor: card }]}>
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
                    <Feather
                      name={opt.icon as any}
                      size={17}
                      color={active ? "#fff" : colors.foreground}
                    />
                    <Text
                      style={[
                        styles.themeOptionLabel,
                        { color: active ? "#fff" : colors.foreground },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Language ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>LANGUAGE</Text>
          <View style={[styles.sectionCard, { backgroundColor: card }]}>
            <Pressable
              style={({ pressed }) => [
                styles.settingsRow,
                styles.lastRow,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.secondary },
              ]}
              onPress={() => setShowLangPicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Select language"
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="globe" size={16} color={PRIMARY} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.foreground }]}>Language</Text>
              </View>
              <View style={styles.settingsRight}>
                <Text style={[styles.settingsValue, { color: colors.mutedForeground }]}>
                  {language.flag} {language.nativeLabel}
                </Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── Apple-style language picker ── */}
        <AppleActionSheet
          visible={showLangPicker}
          title="Choose Language"
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
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>INFORMATION</Text>
          <View style={[styles.sectionCard, { backgroundColor: card }]}>
            {Platform.OS === "ios" && (
              <Pressable
                style={({ pressed }) => [
                  styles.settingsRow,
                  { borderBottomColor: colors.border },
                  pressed && { backgroundColor: colors.secondary },
                ]}
                onPress={runLiveActivityDiagnostic}
                accessibilityRole="button"
                accessibilityLabel="Live Activity diagnostic"
              >
                <View style={styles.settingsLeft}>
                  <View style={[styles.settingsIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name="activity" size={16} color={PRIMARY} />
                  </View>
                  <Text style={[styles.settingsLabel, { color: colors.foreground }]}>Test Live Activity</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.settingsRow,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.secondary },
              ]}
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="info" size={16} color={PRIMARY} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.foreground }]}>About Mora</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.settingsRow,
                styles.lastRow,
                { borderBottomColor: colors.border },
                pressed && { backgroundColor: colors.secondary },
              ]}
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="shield" size={16} color={PRIMARY} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.foreground }]}>Privacy Policy</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
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
  acctTitle: { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 1 },
  themeRow: { flexDirection: "row", padding: 12, gap: 10 },
  themeOption: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  themeOptionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, letterSpacing: 0.3 },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingsLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  settingsRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  settingsIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  settingsLabel: { fontFamily: "Inter_500Medium", fontSize: 15 },
  settingsValue: { fontFamily: "Inter_400Regular", fontSize: 14 },
  section: { paddingHorizontal: 16, marginBottom: 16, marginTop: 16 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  sectionCard: { borderRadius: 16, overflow: "hidden" },
  lastRow: { borderBottomWidth: 0 },
  version: { textAlign: "center", fontFamily: "Inter_400Regular", fontSize: 12, paddingBottom: 8 },
});
