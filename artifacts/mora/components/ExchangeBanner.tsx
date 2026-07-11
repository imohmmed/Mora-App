import React from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useExchange } from "@/context/ExchangeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { cancelExchangeRequest } from "@/lib/api";

const PRIMARY = "#0274C1";

// Pinned note shown while the customer is picking replacement items for an
// active exchange request. Rendered above the tab bar on home/search screens.
export function ExchangeBanner({ bottom }: { bottom: number }) {
  const { activeExchange, clearExchange } = useExchange();
  const { token } = useAuth();
  const { lang } = useLanguage();
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const isAr = lang === "ar";

  if (!activeExchange) return null;

  const confirmCancel = () => {
    const doCancel = () => {
      if (token) cancelExchangeRequest(token, activeExchange.requestId).catch(() => {});
      clearExchange();
    };
    if (Platform.OS === "web") {
      doCancel();
      return;
    }
    Alert.alert(
      isAr ? "إلغاء الاستبدال؟" : "Cancel exchange?",
      isAr ? "راح ينلغي طلب الاستبدال الحالي" : "Your current exchange request will be cancelled",
      [
        { text: isAr ? "رجوع" : "Back", style: "cancel" },
        { text: isAr ? "إلغاء الطلب" : "Cancel it", style: "destructive", onPress: doCancel },
      ],
    );
  };

  return (
    <View style={[st.wrap, { bottom }]} pointerEvents="box-none">
      <View style={[st.card, { backgroundColor: isDark ? "#1C2B3A" : "#EBF5FF", borderColor: PRIMARY }]}>
        <View style={[st.row, isAr && { flexDirection: "row-reverse" }]}>
          <View style={st.iconWrap}>
            <Feather name="refresh-ccw" size={15} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.title, { color: isDark ? "#fff" : "#0F2D44", textAlign: isAr ? "right" : "left" }]}>
              {isAr ? `استبدال الطلب ${activeExchange.orderNumber}` : `Exchange for order ${activeExchange.orderNumber}`}
            </Text>
            <Text style={[st.body, { color: isDark ? "rgba(255,255,255,0.7)" : "rgba(15,45,68,0.75)", textAlign: isAr ? "right" : "left" }]}>
              {isAr
                ? "اختر القطع الجديدة التي تريد استبدال القطع المختارة بها، وبعدين أرسلها من السلة"
                : "Pick the new items you want in exchange, then submit them from the cart"}
            </Text>
          </View>
          <Pressable onPress={confirmCancel} hitSlop={10} style={st.closeBtn}>
            <Feather name="x" size={16} color={isDark ? "rgba(255,255,255,0.6)" : "rgba(15,45,68,0.55)"} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap:     { position: "absolute", left: 12, right: 12, zIndex: 30 },
  card:     { borderRadius: 16, borderWidth: 1.5, padding: 12, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  row:      { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 30, height: 30, borderRadius: 15, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  title:    { fontSize: 13, fontWeight: "800" },
  body:     { fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  closeBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
});
