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
    title: "القبول بالشروط",
    body: "باستخدامك لتطبيق مورا، فأنت توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي من هذه الشروط، يُرجى عدم استخدام التطبيق.",
  },
  {
    title: "الحساب والتسجيل",
    body: "أنت مسؤول عن الحفاظ على سرية بيانات تسجيل دخولك. يجب أن تكون المعلومات التي تقدمها دقيقة وحديثة. مورا غير مسؤولة عن أي خسائر ناتجة عن عدم الحفاظ على أمان حسابك.",
  },
  {
    title: "الطلبات والأسعار",
    body: "نحتفظ بحق رفض أو إلغاء أي طلب لأي سبب. الأسعار قابلة للتغيير دون إشعار مسبق. سيتم تحصيل السعر المعروض وقت إتمام الطلب.",
  },
  {
    title: "التوصيل والاستلام",
    body: "مواعيد التوصيل تقريبية وقد تختلف حسب الموقع الجغرافي والظروف. مورا غير مسؤولة عن التأخيرات الناجمة عن ظروف خارجة عن سيطرتنا.",
  },
  {
    title: "الإرجاع والاستبدال",
    body: "يمكن إرجاع المنتجات خلال 7 أيام من الاستلام بشرط أن تكون بحالتها الأصلية غير مستخدمة. المنتجات المخصصة أو المخفضة قد لا تكون قابلة للإرجاع.",
  },
  {
    title: "الملكية الفكرية",
    body: "جميع المحتويات المعروضة على التطبيق (صور، نصوص، شعارات) هي ملكية حصرية لمورا أو مرخصة لها. لا يجوز إعادة استخدامها دون إذن كتابي.",
  },
  {
    title: "تعديل الشروط",
    body: "نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إخطارك بأي تغييرات جوهرية عبر التطبيق أو البريد الإلكتروني.",
  },
];

const SECTIONS_EN = [
  {
    title: "Acceptance of Terms",
    body: "By using the Mora app, you agree to comply with these Terms & Conditions. If you do not agree to any of these terms, please do not use the app.",
  },
  {
    title: "Account & Registration",
    body: "You are responsible for maintaining the confidentiality of your login credentials. The information you provide must be accurate and up to date. Mora is not liable for any losses resulting from failure to secure your account.",
  },
  {
    title: "Orders & Pricing",
    body: "We reserve the right to refuse or cancel any order for any reason. Prices are subject to change without prior notice. The price displayed at the time of order completion will be charged.",
  },
  {
    title: "Delivery & Receipt",
    body: "Delivery times are estimates and may vary based on location and circumstances. Mora is not responsible for delays caused by circumstances beyond our control.",
  },
  {
    title: "Returns & Exchanges",
    body: "Products can be returned within 7 days of receipt, provided they are in original unused condition. Customized or discounted products may not be eligible for return.",
  },
  {
    title: "Intellectual Property",
    body: "All content displayed in the app (images, text, logos) is the exclusive property of Mora or licensed to it. Reuse without written permission is not permitted.",
  },
  {
    title: "Modification of Terms",
    body: "We reserve the right to modify these terms at any time. You will be notified of any material changes through the app or email.",
  },
];

export default function TermsScreen() {
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
          {isAr ? "الشروط والأحكام" : "Terms & Conditions"}
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
