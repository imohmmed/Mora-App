import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { fetchShippingRules } from "@/lib/api";

const PRIMARY = "#0274C1";

export function ShippingRulesNote({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const { lang } = useLanguage();

  const { data: rules } = useQuery({
    queryKey: ["shipping-rules"],
    queryFn: fetchShippingRules,
    staleTime: 300_000,
  });

  const enabled = (rules ?? []).filter((r) => r.enabled !== false);
  if (enabled.length === 0) return null;

  return (
    <View style={[styles.wrap, style]}>
      {enabled.map((rule) => {
        const text = lang === "ar" && rule.textAr ? rule.textAr : rule.textEn;
        if (!text) return null;
        return (
          <View key={rule.id} style={[styles.row, lang === "ar" && { flexDirection: "row-reverse" }]}>
            <Feather name="truck" size={13} color={PRIMARY} />
            <Text style={[styles.text, { color: colors.mutedForeground }, lang === "ar" && { textAlign: "right" }]}>{text}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: { fontFamily: "Cairo_400Regular", fontSize: 12, flex: 1, lineHeight: 17 },
});
