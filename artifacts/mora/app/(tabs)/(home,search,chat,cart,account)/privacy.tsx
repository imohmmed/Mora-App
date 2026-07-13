import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { GlassBackButton } from "@/components/GlassBackButton";

const PRIMARY = "#0274C1";

const SECTIONS_AR = [
  {
    title: "جمع المعلومات",
    body: "نجمع المعلومات التي تقدمها عند إنشاء حساب، إتمام طلب، أو التواصل معنا. تشمل هذه المعلومات الاسم، البريد الإلكتروني، رقم الهاتف، وعنوان التوصيل.",
  },
  {
    title: "استخدام المعلومات",
    body: "نستخدم معلوماتك لمعالجة الطلبات، إرسال إشعارات التوصيل، تحسين تجربتك، والتواصل معك بخصوص عروض ومنتجات قد تهمك.",
  },
  {
    title: "حماية البيانات",
    body: "نحمي بياناتك باستخدام تقنيات تشفير متقدمة. لا نشارك معلوماتك الشخصية مع أطراف ثالثة إلا عند الضرورة لإتمام طلبك (كشركات التوصيل).",
  },
  {
    title: "ملفات تعريف الارتباط",
    body: "نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح وحفظ تفضيلاتك. يمكنك التحكم في هذه الملفات من إعدادات متصفحك.",
  },
  {
    title: "حقوقك",
    body: "يحق لك طلب الوصول إلى بياناتك، تعديلها، أو حذفها في أي وقت. للقيام بذلك، تواصل معنا عبر قسم الدعم.",
  },
  {
    title: "التواصل",
    body: "إذا كان لديك أي سؤال حول سياسة الخصوصية، تواصل معنا على: support@moramoda.tech",
  },
];

const SECTIONS_EN = [
  {
    title: "Information We Collect",
    body: "We collect information you provide when creating an account, completing an order, or contacting us. This includes your name, email, phone number, and delivery address.",
  },
  {
    title: "How We Use Information",
    body: "We use your information to process orders, send delivery notifications, improve your experience, and communicate about offers and products that may interest you.",
  },
  {
    title: "Data Protection",
    body: "We protect your data using advanced encryption technologies. We do not share your personal information with third parties except when necessary to fulfill your order (e.g., delivery companies).",
  },
  {
    title: "Cookies",
    body: "We use cookies to improve browsing experience and save your preferences. You can control these through your browser settings.",
  },
  {
    title: "Your Rights",
    body: "You have the right to request access, modification, or deletion of your data at any time. To do so, contact us via the Support section.",
  },
  {
    title: "Contact",
    body: "If you have any questions about this Privacy Policy, contact us at: support@moramoda.tech",
  },
];

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { resolvedScheme } = useTheme();
  const { lang } = useLanguage();
  const isDark = resolvedScheme === "dark";
  const isAr = lang === "ar";
  const topPad = Platform.OS === "web" ? 16 : insets.top;
  const botPad = Platform.OS === "web" ? 0 : insets.bottom;
  const sections = isAr ? SECTIONS_AR : SECTIONS_EN;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0A0A0A" : "#FFFFFF" }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <GlassBackButton isDark={isDark} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: botPad + 40 }}
      >
        <Text style={[styles.updated, { color: colors.mutedForeground, textAlign: isAr ? "right" : "left" }]}>
          {isAr ? "آخر تحديث: يناير 2025" : "Last updated: January 2025"}
        </Text>

        {sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={[styles.sTitle, { color: PRIMARY, textAlign: isAr ? "right" : "left" }]}>
              {`${i + 1}. ${s.title}`}
            </Text>
            <Text style={[styles.sBody, { color: colors.foreground, textAlign: isAr ? "right" : "left" }]}>
              {s.body}
            </Text>
          </View>
        ))}
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
  updated: { fontFamily: "Cairo_400Regular", fontSize: 12, marginBottom: 20 },
  section: { marginBottom: 20 },
  sTitle: { fontFamily: "Cairo_700Bold", fontSize: 14, marginBottom: 6 },
  sBody: { fontFamily: "Cairo_400Regular", fontSize: 13.5, lineHeight: 23 },
});
