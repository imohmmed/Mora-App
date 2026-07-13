import React from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { GlassBackButton } from "@/components/GlassBackButton";

const PRIMARY = "#0274C1";

export default function SupportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { resolvedScheme } = useTheme();
  const { lang } = useLanguage();
  const router = useRouter();
  const isDark = resolvedScheme === "dark";
  const isAr = lang === "ar";
  const topPad = Platform.OS === "web" ? 16 : insets.top;
  const botPad = Platform.OS === "web" ? 0 : insets.bottom;

  const card = isDark ? "#1C1C1E" : "#F5F9FF";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";

  const options = [
    {
      icon: "message-circle" as const,
      titleAr: "الدردشة المباشرة",
      titleEn: "Live Chat",
      descAr: "تحدث مع فريق الدعم مباشرة",
      descEn: "Chat with our support team directly",
      onPress: () => router.push("/chat" as any),
      color: PRIMARY,
    },
    {
      icon: "phone" as const,
      titleAr: "واتساب",
      titleEn: "WhatsApp",
      descAr: "راسلنا على واتساب",
      descEn: "Message us on WhatsApp",
      onPress: () => Linking.openURL("https://wa.me/9647700000000"),
      color: "#25D366",
    },
    {
      icon: "mail" as const,
      titleAr: "البريد الإلكتروني",
      titleEn: "Email",
      descAr: "support@moramoda.tech",
      descEn: "support@moramoda.tech",
      onPress: () => Linking.openURL("mailto:support@moramoda.tech"),
      color: "#F59E0B",
    },
    {
      icon: "help-circle" as const,
      titleAr: "أسئلة شائعة",
      titleEn: "FAQ",
      descAr: "ابحث في الأسئلة الشائعة",
      descEn: "Browse frequently asked questions",
      onPress: () => router.push("/faq" as any),
      color: "#8B5CF6",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0A0A0A" : "#FFFFFF" }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <GlassBackButton isDark={isDark} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isAr ? "الدعم" : "Support"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: botPad + 40, gap: 10 }}
      >
        <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: isAr ? "right" : "left" }]}>
          {isAr ? "كيف يمكننا مساعدتك؟" : "How can we help you?"}
        </Text>

        {options.map((opt, i) => (
          <Pressable
            key={i}
            onPress={opt.onPress}
            style={({ pressed }) => [
              styles.optCard,
              { backgroundColor: card, borderColor: border },
              pressed && { opacity: 0.75 },
              isAr && { flexDirection: "row-reverse" },
            ]}
          >
            <View style={[styles.optIcon, { backgroundColor: opt.color + "18" }]}>
              <Feather name={opt.icon} size={20} color={opt.color} />
            </View>
            <View style={[styles.optInfo, isAr && { alignItems: "flex-end" }]}>
              <Text style={[styles.optTitle, { color: colors.foreground }]}>
                {isAr ? opt.titleAr : opt.titleEn}
              </Text>
              <Text style={[styles.optDesc, { color: colors.mutedForeground }]}>
                {isAr ? opt.descAr : opt.descEn}
              </Text>
            </View>
            <Feather
              name={isAr ? "chevron-left" : "chevron-right"}
              size={16}
              color={colors.mutedForeground}
            />
          </Pressable>
        ))}

        <View style={[styles.hoursCard, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.hoursTitle, { color: colors.foreground, textAlign: isAr ? "right" : "left" }]}>
            {isAr ? "ساعات العمل" : "Working Hours"}
          </Text>
          <Text style={[styles.hoursBody, { color: colors.mutedForeground, textAlign: isAr ? "right" : "left" }]}>
            {isAr
              ? "الأحد — الخميس: 9 صباحاً – 9 مساءً\nالجمعة — السبت: 10 صباحاً – 6 مساءً"
              : "Sunday — Thursday: 9 AM – 9 PM\nFriday — Saturday: 10 AM – 6 PM"}
          </Text>
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
  title: { fontFamily: "Cairo_700Bold", fontSize: 15, letterSpacing: 0.5 },
  subtitle: { fontFamily: "Cairo_600SemiBold", fontSize: 16, marginBottom: 4 },
  optCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  optIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  optInfo: { flex: 1, gap: 2 },
  optTitle: { fontFamily: "Cairo_600SemiBold", fontSize: 14 },
  optDesc: { fontFamily: "Cairo_400Regular", fontSize: 12.5 },
  hoursCard: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 8, marginTop: 4 },
  hoursTitle: { fontFamily: "Cairo_700Bold", fontSize: 14 },
  hoursBody: { fontFamily: "Cairo_400Regular", fontSize: 13, lineHeight: 22 },
});
