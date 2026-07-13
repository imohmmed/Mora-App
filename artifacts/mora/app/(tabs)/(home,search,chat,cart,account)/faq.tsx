import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { GlassBackButton } from "@/components/GlassBackButton";

const PRIMARY = "#0274C1";

const FAQS_AR = [
  { q: "كيف أتتبع طلبي؟", a: "بعد تأكيد الطلب ستصلك رسالة تأكيد. يمكنك متابعة حالة الطلب من قسم 'طلباتي' في حسابك." },
  { q: "كم يستغرق التوصيل؟", a: "التوصيل داخل بغداد من 1-2 أيام عمل، وباقي المحافظات من 2-4 أيام عمل." },
  { q: "هل يمكنني إرجاع المنتج؟", a: "نعم، يمكنك إرجاع المنتج خلال 7 أيام من الاستلام بشرط أن يكون بحالته الأصلية وغير مستخدم." },
  { q: "ما هي طرق الدفع المتاحة؟", a: "ندعم الدفع عند الاستلام (COD) وكذلك الدفع الإلكتروني عبر Wayl." },
  { q: "هل المقاسات دقيقة؟", a: "نعم، نوفر جدول مقاسات تفصيلي لكل منتج. يمكنك أيضاً حفظ مقاسك في قسم 'مقاسي'." },
  { q: "كيف أستخدم كود الخصم؟", a: "عند إتمام الشراء، أدخل كود الخصم في الحقل المخصص وسيطبق الخصم تلقائياً." },
  { q: "هل يمكنني تغيير عنوان التوصيل؟", a: "يمكنك تعديل العنوان قبل تأكيد الطلب. بعد التأكيد تواصل مع الدعم فوراً." },
];

const FAQS_EN = [
  { q: "How do I track my order?", a: "After your order is confirmed, you'll receive a confirmation message. Track your order status under 'My Orders' in your account." },
  { q: "How long does delivery take?", a: "Delivery within Baghdad takes 1-2 business days, and to other governorates 2-4 business days." },
  { q: "Can I return a product?", a: "Yes, you can return products within 7 days of receipt, provided they are in original condition and unused." },
  { q: "What payment methods are available?", a: "We support Cash on Delivery (COD) and electronic payment via Wayl." },
  { q: "Are the sizes accurate?", a: "Yes, we provide a detailed size chart for each product. You can also save your size in 'My Size'." },
  { q: "How do I use a discount code?", a: "At checkout, enter your discount code in the designated field and the discount will apply automatically." },
  { q: "Can I change my delivery address?", a: "You can edit the address before confirming your order. After confirmation, contact support immediately." },
];

export default function FAQScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { resolvedScheme } = useTheme();
  const { lang } = useLanguage();
  const isDark = resolvedScheme === "dark";
  const isAr = lang === "ar";
  const topPad = Platform.OS === "web" ? 16 : insets.top;
  const botPad = Platform.OS === "web" ? 0 : insets.bottom;
  const faqs = isAr ? FAQS_AR : FAQS_EN;
  const [open, setOpen] = useState<number | null>(null);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0A0A0A" : "#FFFFFF" }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <GlassBackButton isDark={isDark} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isAr ? "أسئلة شائعة" : "FAQ"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: botPad + 40, gap: 8 }}
      >
        {faqs.map((item, i) => {
          const isOpen = open === i;
          return (
            <Pressable
              key={i}
              onPress={() => setOpen(isOpen ? null : i)}
              style={[
                styles.item,
                { backgroundColor: isDark ? "#1C1C1E" : "#F5F9FF", borderColor: isOpen ? PRIMARY : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)") },
              ]}
            >
              <View style={[styles.qRow, isAr && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.q, { color: colors.foreground, flex: 1, textAlign: isAr ? "right" : "left" }]}>
                  {item.q}
                </Text>
                <Feather
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={isOpen ? PRIMARY : colors.mutedForeground}
                />
              </View>
              {isOpen && (
                <Text style={[styles.a, { color: colors.mutedForeground, textAlign: isAr ? "right" : "left" }]}>
                  {item.a}
                </Text>
              )}
            </Pressable>
          );
        })}
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
  item: { borderRadius: 14, padding: 16, borderWidth: 1.5 },
  qRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  q: { fontFamily: "Cairo_600SemiBold", fontSize: 14, lineHeight: 22 },
  a: { fontFamily: "Cairo_400Regular", fontSize: 13.5, lineHeight: 22, marginTop: 10 },
});
