import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { GlassBackButton } from "@/components/GlassBackButton";

const PRIMARY = "#0274C1";

export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { resolvedScheme } = useTheme();
  const { lang } = useLanguage();
  const isDark = resolvedScheme === "dark";
  const isAr = lang === "ar";
  const topPad = Platform.OS === "web" ? 16 : insets.top;
  const botPad = Platform.OS === "web" ? 0 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0A0A0A" : "#FFFFFF" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <GlassBackButton isDark={isDark} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isAr ? "عن مورا" : "About Mora"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: botPad + 40 }}
      >
        {/* Logo block */}
        <View style={[styles.logoBlock, { backgroundColor: PRIMARY }]}>
          <Text style={styles.logoText}>MORA</Text>
          <Text style={styles.logoSub}>{isAr ? "الموضة في متناول يديك" : "Fashion at your fingertips"}</Text>
        </View>

        <Block
          title={isAr ? "من نحن" : "Who We Are"}
          body={isAr
            ? "مورا هي منصة أزياء عراقية متخصصة في تقديم أحدث صيحات الموضة للرجال والنساء. نؤمن بأن الستايل ليس رفاهية — بل هو تعبير عن هويتك."
            : "Mora is an Iraqi fashion platform dedicated to bringing the latest trends for men and women. We believe style isn't a luxury — it's an expression of who you are."}
          colors={colors}
          isDark={isDark}
        />

        <Block
          title={isAr ? "مهمتنا" : "Our Mission"}
          body={isAr
            ? "نسعى لجعل التسوق الذكي سهلاً وممتعاً — بأسعار مناسبة، منتجات عالية الجودة، وتجربة توصيل سلسة لباب بيتك."
            : "We strive to make smart shopping easy and enjoyable — with fair prices, quality products, and a smooth delivery experience right to your door."}
          colors={colors}
          isDark={isDark}
        />

        <Block
          title={isAr ? "تواصل معنا" : "Contact Us"}
          body={isAr
            ? "لأي استفسار أو مقترح، تواصل معنا عبر قسم الدعم أو من خلال الدردشة داخل التطبيق. فريقنا جاهز لمساعدتك."
            : "For any inquiry or suggestion, reach us through the Support section or live chat inside the app. Our team is ready to help."}
          colors={colors}
          isDark={isDark}
        />

        <Text style={[styles.version, { color: colors.mutedForeground }]}>Mora v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function Block({ title, body, colors, isDark }: { title: string; body: string; colors: ReturnType<typeof useColors>; isDark: boolean }) {
  return (
    <View style={[styles.block, { backgroundColor: isDark ? "#1C1C1E" : "#F5F9FF", borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }]}>
      <Text style={[styles.blockTitle, { color: PRIMARY }]}>{title}</Text>
      <Text style={[styles.blockBody, { color: colors.foreground }]}>{body}</Text>
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
  logoBlock: {
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    marginBottom: 20,
  },
  logoText: { fontFamily: "Cairo_900Black", fontSize: 36, color: "#FFFFFF", letterSpacing: 6 },
  logoSub: { fontFamily: "Cairo_400Regular", fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  block: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    gap: 6,
  },
  blockTitle: { fontFamily: "Cairo_700Bold", fontSize: 14 },
  blockBody: { fontFamily: "Cairo_400Regular", fontSize: 13.5, lineHeight: 22 },
  version: { fontFamily: "Cairo_400Regular", fontSize: 12, textAlign: "center", marginTop: 12 },
});
