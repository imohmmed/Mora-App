import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { GlassBackButton } from "@/components/GlassBackButton";

const PRIMARY = "#0274C1";
const INSTA_URL = "https://instagram.com/mora.moda1";

type FaqItem = { q: string; a: string | React.ReactNode };

const FAQS_AR: FaqItem[] = [
  {
    q: "شلون أطلب؟",
    a: "أضف المنتج إلى السلة، ثم أكمل إضافة عنوانك، واضغط على (تثبيت الطلب). بس هيچي! ✅",
  },
  {
    q: "شكد مدة التوصيل؟",
    a: "مدة التوصيل خلال 3-5 أيام عمل.",
  },
  {
    q: "شنو طرق الدفع؟",
    a: "نوفر عدة طرق دفع:\n• الدفع عند الاستلام (COD) ✅\n• آسياسيل ✅\n• زين كاش ✅\n• ماستر كارد ✅",
  },
  {
    q: "شلون أحصل خصم 10%؟",
    a: "النجمة للزبائن المميزين (مشترياتهم فوق 200,000 د.ع).\n\nمميزات النجمة ⭐:\n• خصم دائمي 10% لكل الطلبات\n• ضمان ذهبي — تبديل وترجيع مجاني لمدة 15 يوم لـ 90% من المنتجات\n• توصيل سريع خلال 1-3 أيام 🏎️\n• متابعة من حساب @mora.plus وإضافة بالكلوز فيه عروض حصرية 💫\n\nإذا كانت عندك طلبات بنفس المبلغ أرسل الوصولات أو كودات الطلبات إلى @mora.moda1 حتى نتأكد وتصير من نجوم مورا 🫂",
  },
  {
    q: "شلون أعرف خامة وجودة المنتج؟",
    a: "يتم كتابة كل تفاصيل الخامة والجودة في حقل الوصف داخل صفحة المنتج. تقدر تطلع عليها قبل الطلب.",
  },
  {
    q: "طريقة إلغاء الطلب",
    a: "أرسل لنا كود الطلب (يطلع بنهاية صفحة الطلب) عبر حساب الإنستا @mora.moda1\n\nإذا ما عندك الكود، أرسل المعلومات اللي كتبتها بالطلب مع سبب الإلغاء.",
  },
  {
    q: "هل أقدر أرجع أو أبدل المنتج؟",
    a: "نعم! لزبائن النجمة: ترجيع وتبديل مجاني لمدة 15 يوم لـ 90% من المنتجات.\n\nلباقي الزبائن: التبديل متاح خلال 7 أيام بشرط أن يكون المنتج بحالته الأصلية وغير مستخدم. تواصل معنا عبر @mora.moda1",
  },
  {
    q: "كيف أتتبع طلبي؟",
    a: "بعد تأكيد طلبك، يمكنك متابعة حالته من قسم 'طلباتي' في صفحة حسابك داخل التطبيق. كل مرحلة تتحدث تلقائياً.",
  },
  {
    q: "هل المقاسات دقيقة؟",
    a: "نعم، نوفر جدول مقاسات تفصيلي لكل منتج داخل الوصف. يمكنك أيضاً حفظ مقاسك في قسم 'مقاسي' بالحساب لتسهيل الطلب في المستقبل.",
  },
  {
    q: "هل أقدر أعدل على طلبي بعد التأكيد؟",
    a: "إذا حبيت تعدل على الطلب بعد التأكيد، تواصل معنا فوراً عبر @mora.moda1 على إنستغرام. سنحاول المساعدة قبل أن يتم الشحن.",
  },
  {
    q: "شلون أتواصل مع الدعم؟",
    a: "تقدر تتواصل معنا مباشرة عبر حساب الإنستغرام @mora.moda1 — نرد بأسرع وقت ممكن 💙",
  },
];

const FAQS_EN: FaqItem[] = [
  {
    q: "How do I place an order?",
    a: "Add the product to your cart, complete your delivery address, then tap 'Confirm Order'. That's it! ✅",
  },
  {
    q: "How long does delivery take?",
    a: "Delivery takes 3-5 business days.",
  },
  {
    q: "What payment methods are available?",
    a: "We offer multiple payment options:\n• Cash on Delivery (COD) ✅\n• Asiacell ✅\n• Zain Cash ✅\n• Mastercard ✅",
  },
  {
    q: "How do I get a 10% discount?",
    a: "The Star tier is for loyal customers (total purchases over 200,000 IQD).\n\nStar benefits ⭐:\n• Permanent 10% discount on all orders\n• Golden guarantee — free exchange & return for 15 days on 90% of products\n• Fast delivery within 1-3 days 🏎️\n• Followed by @mora.plus and added to their close friends for exclusive offers 💫\n\nSend your order receipts or order codes to @mora.moda1 on Instagram to verify and become a Mora Star 🫂",
  },
  {
    q: "How do I know product quality & material?",
    a: "Full material and quality details are written in the product description section on each product page. Check it before ordering.",
  },
  {
    q: "How do I cancel my order?",
    a: "Send us your order code (found at the bottom of your order page) via Instagram @mora.moda1.\n\nIf you don't have the code, send us the information you entered in the order along with your reason for cancellation.",
  },
  {
    q: "Can I return or exchange a product?",
    a: "Yes! Star customers: free exchange & return for 15 days on 90% of products.\n\nOther customers: exchanges available within 7 days, provided the product is in its original, unused condition. Contact us via @mora.moda1",
  },
  {
    q: "How do I track my order?",
    a: "After confirming your order, track its status from the 'My Orders' section in your account. Each stage updates automatically.",
  },
  {
    q: "Are sizes accurate?",
    a: "Yes! We provide a detailed size chart in every product description. You can also save your measurements in 'My Size' in your profile for easier future orders.",
  },
  {
    q: "Can I modify my order after confirming?",
    a: "If you need to modify your order after confirmation, contact us immediately via @mora.moda1 on Instagram. We'll do our best to help before the order ships.",
  },
  {
    q: "How can I contact support?",
    a: "You can reach us directly via @mora.moda1 on Instagram — we reply as fast as possible 💙",
  },
];

function AccordionItem({ item, index, isOpen, onToggle, isDark, isAr, colors }: {
  item: FaqItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  isDark: boolean;
  isAr: boolean;
  colors: any;
}) {
  const rotation = useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const height = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  const toggle = useCallback(() => {
    Animated.parallel([
      Animated.timing(rotation, {
        toValue: isOpen ? 0 : 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(height, {
        toValue: isOpen ? 0 : 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
    onToggle();
  }, [isOpen, onToggle, rotation, height]);

  const chevronRotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const answerText = typeof item.a === "string" ? item.a : null;
  const hasInstagram = answerText?.includes("@mora.moda1");

  const renderAnswer = () => {
    if (!answerText) return null;
    if (!hasInstagram) {
      return (
        <Text style={[styles.answer, { color: colors.mutedForeground }]}>
          {answerText}
        </Text>
      );
    }
    const parts = answerText.split("@mora.moda1");
    return (
      <Text style={[styles.answer, { color: colors.mutedForeground }]}>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {part}
            {i < parts.length - 1 && (
              <Text
                style={{ color: PRIMARY, fontFamily: "Cairo_600SemiBold" }}
                onPress={() => Linking.openURL(INSTA_URL)}
              >
                @mora.moda1
              </Text>
            )}
          </React.Fragment>
        ))}
      </Text>
    );
  };

  return (
    <View style={[
      styles.item,
      {
        backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
        borderColor: isOpen ? PRIMARY : (isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)"),
        shadowColor: isOpen ? PRIMARY : "#000",
        shadowOpacity: isOpen ? 0.1 : 0.03,
        shadowRadius: isOpen ? 8 : 3,
        shadowOffset: { width: 0, height: 2 },
        elevation: isOpen ? 4 : 1,
      },
    ]}>
      <Pressable
        onPress={toggle}
        style={[styles.qRow, isAr ? { flexDirection: "row" } : { flexDirection: "row-reverse" }]}
        hitSlop={8}
      >
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <Feather
            name="chevron-down"
            size={18}
            color={isOpen ? PRIMARY : colors.mutedForeground}
          />
        </Animated.View>
        <Text style={[
          styles.question,
          { color: isOpen ? PRIMARY : colors.foreground, flex: 1, textAlign: "right" },
        ]}>
          {item.q}
        </Text>
      </Pressable>

      {isOpen && (
        <View style={[styles.answerWrap, { borderTopColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }]}>
          {renderAnswer()}
        </View>
      )}
    </View>
  );
}

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
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0A0A0A" : "#F5F7FA" }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <GlassBackButton isDark={isDark} />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 48 }}
      >
        {/* Hero section */}
        <View style={styles.hero}>
          <View style={[styles.badge, { backgroundColor: isDark ? "rgba(2,116,193,0.18)" : "rgba(2,116,193,0.1)" }]}>
            <Text style={[styles.badgeText, { color: PRIMARY }]}>
              {isAr ? "• الأسئلة الشائعة •" : "• FAQ •"}
            </Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            {isAr ? "كيف نقدر نساعدك؟" : "How can we help you?"}
          </Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            {isAr
              ? "جمعنا أكثر الأسئلة اللي تصلنا من زبائننا"
              : "We've collected the most common questions from our customers"}
          </Text>
        </View>

        {/* Accordion list */}
        <View style={styles.list}>
          {faqs.map((item, i) => (
            <AccordionItem
              key={i}
              item={item}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
              isDark={isDark}
              isAr={isAr}
              colors={colors}
            />
          ))}
        </View>

        {/* Contact strip */}
        <Pressable
          style={[styles.contactStrip, {
            backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
            borderColor: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)",
          }]}
          onPress={() => Linking.openURL(INSTA_URL)}
        >
          <Feather name="instagram" size={20} color={PRIMARY} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.contactTitle, { color: colors.foreground }]}>
              {isAr ? "ما لقيت جوابك؟" : "Didn't find your answer?"}
            </Text>
            <Text style={[styles.contactSub, { color: PRIMARY }]}>@mora.moda1</Text>
          </View>
          <Feather name="arrow-left" size={16} color={colors.mutedForeground} />
        </Pressable>
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
    paddingBottom: 4,
  },

  /* Hero */
  hero: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 10,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 2,
  },
  badgeText: { fontFamily: "Cairo_700Bold", fontSize: 13, letterSpacing: 0.5 },
  heroTitle: { fontFamily: "Cairo_700Bold", fontSize: 26, textAlign: "center", lineHeight: 40 },
  heroSub: { fontFamily: "Cairo_400Regular", fontSize: 13.5, textAlign: "center", lineHeight: 22 },

  /* Accordion list */
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 16 },

  item: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  qRow: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  question: { fontFamily: "Cairo_600SemiBold", fontSize: 14.5, lineHeight: 24 },
  answerWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  answer: {
    fontFamily: "Cairo_400Regular",
    fontSize: 13.5,
    lineHeight: 24,
    textAlign: "right",
  },

  /* Contact strip */
  contactStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 6,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  contactTitle: { fontFamily: "Cairo_600SemiBold", fontSize: 14, textAlign: "right" },
  contactSub: { fontFamily: "Cairo_400Regular", fontSize: 13 },
});
