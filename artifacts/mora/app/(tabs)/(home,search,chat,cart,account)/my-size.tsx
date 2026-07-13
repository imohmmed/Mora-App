import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { GlassBackButton } from "@/components/GlassBackButton";
import { SeoHead } from "@/components/SeoHead";

const PRIMARY = "#0274C1";
const STORAGE_KEY = "mora.mysize.v1";

const TOP_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const SHOE_SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
const FIT_OPTIONS = ["Slim", "Regular", "Relaxed"];

type SizePrefs = { top: string | null; shoe: string | null; fit: string | null };

export default function MySizeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const card = isDark ? "#1C1C1E" : "#EBF5FF";
  const bg = isDark ? "#0A0A0A" : "#FFFFFF";
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const botPad = Platform.OS === "web" ? 0 : insets.bottom;

  const [prefs, setPrefs] = useState<SizePrefs>({ top: null, shoe: null, fit: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setPrefs({ top: null, shoe: null, fit: null, ...JSON.parse(raw) });
      } catch {}
      setLoading(false);
    })();
  }, []);

  const update = (patch: Partial<SizePrefs>) => {
    Haptics.selectionAsync();
    setPrefs((p) => {
      const next = { ...p, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const Chip = ({
    label,
    active,
    onPress,
  }: { label: string; active: boolean; onPress: () => void }) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? PRIMARY : colors.secondary,
          borderColor: active ? PRIMARY : colors.border,
        },
      ]}
    >
      <Text style={[styles.chipTxt, { color: active ? "#fff" : colors.foreground }]}>{label}</Text>
    </Pressable>
  );

  const Group = ({
    title,
    options,
    selected,
    onSelect,
  }: { title: string; options: string[]; selected: string | null; onSelect: (v: string) => void }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={[styles.sectionCard, { backgroundColor: card }]}>
        <View style={styles.chipWrap}>
          {options.map((opt) => (
            <Chip
              key={opt}
              label={opt}
              active={selected === opt}
              onPress={() => onSelect(selected === opt ? "" : opt)}
            />
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <SeoHead page="mySize" noIndex />
      <View style={[styles.acctHeader, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <GlassBackButton onPress={() => router.back()} />
        <Text style={[styles.acctTitle, { color: colors.foreground }]}>MY SIZE</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.centeredBox}>
          <ActivityIndicator color={PRIMARY} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: botPad + 80 }}
        >
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            We use your sizes to highlight the right fit while you shop.
          </Text>

          <Group
            title="CLOTHING SIZE"
            options={TOP_SIZES}
            selected={prefs.top}
            onSelect={(v) => update({ top: v || null })}
          />
          <Group
            title="SHOE SIZE (EU)"
            options={SHOE_SIZES}
            selected={prefs.shoe}
            onSelect={(v) => update({ shoe: v || null })}
          />
          <Group
            title="PREFERRED FIT"
            options={FIT_OPTIONS}
            selected={prefs.fit}
            onSelect={(v) => update({ fit: v || null })}
          />
        </ScrollView>
      )}
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
  hint: { fontFamily: "Cairo_400Regular", fontSize: 12.5, lineHeight: 18, marginBottom: 8, paddingHorizontal: 18 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionLabel: { fontFamily: "Cairo_700Bold", fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  sectionCard: { borderRadius: 16, padding: 12 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    minWidth: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  chipTxt: { fontFamily: "Cairo_600SemiBold", fontSize: 14 },
  centeredBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
});
