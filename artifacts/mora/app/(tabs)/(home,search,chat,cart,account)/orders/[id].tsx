import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { fetchOrder } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import { GlassBackButton } from "@/components/GlassBackButton";

const PRIMARY = "#0274C1";

function getBaseUrl() {
  const d = process.env.EXPO_PUBLIC_DOMAIN;
  return d ? `https://${d}/api` : "/api";
}

type FullAddress = {
  fullName?: string; firstName?: string; lastName?: string;
  phone?: string; phone2?: string;
  instagram?: string;
  city?: string; district?: string; street?: string; landmark?: string;
  country?: string;
};

function statusColor(status: string) {
  if (status === "completed" || status === "delivered") return "#22C55E";
  if (status === "partial_return") return "#EA580C";
  if (status === "returned" || status === "returned_no_restock") return "#E11D48";
  if (status === "processing") return PRIMARY;
  if (status === "cancelled") return "#EF4444";
  return "#F59E0B";
}

function statusLabel(status: string, isAr: boolean) {
  const map: Record<string, { en: string; ar: string }> = {
    pending:    { en: "Pending",    ar: "قيد الانتظار" },
    processing: { en: "Processing", ar: "يجري التجهيز" },
    completed:  { en: "Completed",  ar: "مكتمل" },
    cancelled:  { en: "Cancelled",  ar: "ملغى" },
    delivered:  { en: "Delivered",  ar: "تم التوصيل" },
    confirmed:  { en: "Confirmed",  ar: "تم التثبيت" },
    preparing:  { en: "Preparing",  ar: "يتم التجهيز" },
    shipping:   { en: "Shipping",   ar: "يتم الشحن" },
    issue:      { en: "Issue",      ar: "مشكلة" },
    returned:            { en: "Returned",            ar: "تم الإرجاع" },
    partial_return:      { en: "Delivered (partial)", ar: "تم التوصيل (جزئي)" },
    returned_no_restock: { en: "Returned",            ar: "تم الإرجاع" },
  };
  const entry = map[status];
  if (!entry) return status;
  return isAr ? entry.ar : entry.en;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function SectionLabel({ text, sub, isAr }: { text: string; sub: string; isAr?: boolean }) {
  return (
    <Text style={[st.sectionLbl, { color: sub }, isAr && { textAlign: "right" }]}>
      {text}
    </Text>
  );
}

function InfoRow({
  label, value, textCol, sub, isAr,
}: { label: string; value: string; textCol: string; sub: string; isAr?: boolean }) {
  return (
    <View style={[st.infoRow, isAr && { flexDirection: "row-reverse" }]}>
      <Text style={[st.infoLbl, { color: sub }, isAr && { textAlign: "right" }]}>{label}</Text>
      <Text style={[st.infoVal, { color: textCol }, isAr && { textAlign: "right" }]}>{value}</Text>
    </View>
  );
}

function StarRow({ rating, size, onPress }: { rating: number; size?: number; onPress?: (r: number) => void }) {
  const s = size ?? 28;
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onPress?.(i)} hitSlop={6} disabled={!onPress}>
          <Feather
            name="star"
            size={s}
            color={i <= rating ? "#F59E0B" : "rgba(128,128,128,0.25)"}
          />
        </Pressable>
      ))}
    </View>
  );
}

export default function OrderDetailScreen() {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const queryClient = useQueryClient();

  const { id, email: emailParam } = useLocalSearchParams<{ id: string; email: string }>();
  const email = emailParam || user?.email || "";

  const bg      = isDark ? "#0A0A0A" : "#FFFFFF";
  const card    = isDark ? "#1C1C1E" : "#EBF5FF";
  const textCol = isDark ? "#FFFFFF" : "#1A1A1A";
  const sub     = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)";
  const divClr  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const divider = isDark ? "#1A1A1A" : "#EBEBEB";
  const isWeb   = Platform.OS === "web";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  const [starRating, setStarRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", id, email],
    queryFn: () => fetchOrder(id!, email),
    enabled: !!id && !!email,
  });

  const addr        = (order?.shippingAddress ?? {}) as FullAddress;
  const displayName = addr.fullName || [addr.firstName, addr.lastName].filter(Boolean).join(" ") || "—";

  const deliveryStage  = (order as any)?.deliveryStage as string | undefined;
  const isPartialReturn = deliveryStage === "partial_return";
  // Partial returns still count as delivered — the customer can rate the order
  const isDelivered    = deliveryStage === "delivered" || isPartialReturn;
  const existingRating: number = (order as any)?.reviewRating ?? 0;
  const existingText: string   = (order as any)?.reviewText ?? "";
  const hasReview      = submitted || existingRating > 0;
  const displayRating  = submitted ? starRating : existingRating;
  const displayText    = submitted ? reviewText : existingText;

  const handleSubmitReview = async () => {
    if (starRating === 0) {
      Alert.alert(
        isAr ? "مطلوب" : "Required",
        isAr ? "يرجى اختيار عدد النجوم" : "Please select a star rating",
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `${getBaseUrl()}/store/orders/${id}/review?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: starRating, text: reviewText.trim() }),
        }
      );
      const json = await res.json() as { data: unknown; error?: string };
      if (!res.ok) throw new Error((json as any).error || "Failed");
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["orders", email] });
      queryClient.invalidateQueries({ queryKey: ["order", id, email] });
    } catch {
      Alert.alert(
        isAr ? "خطأ" : "Error",
        isAr ? "حدث خطأ، حاول مجدداً" : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={PRIMARY} size="large" />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        <View style={[st.header, { paddingTop: insets.top + 6, paddingHorizontal: 16, borderBottomColor: divider, borderBottomWidth: isWeb ? 1 : 0 }]}>
          {isWeb ? (
            <>
              <Pressable style={st.flatBtn} onPress={() => router.back()}>
                <Feather name={isAr ? "chevron-right" : "chevron-left"} size={22} color={textCol} />
              </Pressable>
              <Text style={[st.pageTitleWeb, { color: textCol }, isAr && { textAlign: "right" }]}>
                {isAr ? "تفاصيل الطلب" : "ORDER DETAIL"}
              </Text>
              <View style={{ width: 36 }} />
            </>
          ) : (
            <>
              <GlassBackButton onPress={() => router.back()} />
              <Text style={[st.headTitle, { color: textCol }]}>{isAr ? "تفاصيل الطلب" : "Order Detail"}</Text>
              <View style={{ width: 36 }} />
            </>
          )}
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Feather name="package" size={48} color={sub} />
          <Text style={{ color: sub, fontSize: 15 }}>{isAr ? "الطلب غير موجود" : "Order not found"}</Text>
        </View>
      </View>
    );
  }

  const col   = statusColor((order as any).deliveryStage || order.status);
  const items = order.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* ── Header — back button always left ── */}
      <View style={[st.header, { paddingTop: insets.top + 6, paddingHorizontal: 16, borderBottomColor: divider, borderBottomWidth: isWeb ? 1 : 0 }]}>
        {isWeb ? (
          <>
            <Pressable style={st.flatBtn} onPress={() => router.back()}>
              <Feather name={isAr ? "chevron-right" : "chevron-left"} size={22} color={textCol} />
            </Pressable>
            <Text style={[st.pageTitleWeb, { color: textCol }, isAr && { textAlign: "right" }]}>
              {order.orderNumber
                ? `${isAr ? "طلب #" : "ORDER #"}${order.orderNumber}`
                : (isAr ? "تفاصيل الطلب" : "ORDER DETAIL")}
            </Text>
            <View style={{ width: 36 }} />
          </>
        ) : (
          <>
            <GlassBackButton onPress={() => router.back()} />
            <Text style={[st.headTitle, { color: textCol }]}>
              {order.orderNumber
                ? `${isAr ? "طلب" : "Order"} ${order.orderNumber}`
                : (isAr ? "تفاصيل الطلب" : "Order Detail")}
            </Text>
            <View style={{ width: 36 }} />
          </>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 110 : 48,
        }}
      >
        {/* ── Status card ── */}
        <View style={[
          st.statusCard,
          { backgroundColor: col + (isDark ? "18" : "12"), borderColor: col + "40" },
          isAr && { flexDirection: "row-reverse" },
          isWeb && { margin: 0, borderRadius: 0, borderLeftWidth: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomWidth: 1, borderBottomColor: divider },
        ]}>
          <View style={[st.statusDot, { backgroundColor: col }]} />
          <View style={{ flex: 1 }}>
            <Text style={[st.statusLabel, { color: col }, isAr && { textAlign: "right" }]}>
              {statusLabel((order as any).deliveryStage || order.status, isAr)}
            </Text>
            <Text style={[st.statusDate, { color: sub }, isAr && { textAlign: "right" }]}>
              {formatDate(order.createdAt)}
            </Text>
          </View>
          <Text style={[st.statusTotal, { color: textCol }]}>{formatIQD(order.total)}</Text>
        </View>

        {/* ── Items ── */}
        <SectionLabel text={isAr ? "الأصناف" : "ITEMS"} sub={sub} isAr={isAr} />
        <View style={[st.group, { backgroundColor: isWeb ? "transparent" : card }, isWeb && { marginHorizontal: 0, borderRadius: 0, borderTopWidth: 1, borderTopColor: divider, borderBottomWidth: 1, borderBottomColor: divider }]}>
          {items.map((item, idx) => (
            <View key={(item as any).id ?? idx}>
              {idx > 0 && <View style={[st.divider, { backgroundColor: divClr }, isWeb && { marginHorizontal: 0 }]} />}
              <View style={[st.itemRow, isAr && { flexDirection: "row-reverse" }]}>
                {(item as any).image ? (
                  <Image source={{ uri: (item as any).image }} style={st.itemImg} contentFit="cover" />
                ) : (
                  <View style={[st.itemImg, { backgroundColor: divClr, alignItems: "center", justifyContent: "center" }]}>
                    <Feather name="image" size={18} color={sub} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    style={[st.itemTitle, { color: textCol }, isAr && { textAlign: "right" }]}
                    numberOfLines={2}
                  >
                    {(item as any).title}
                  </Text>
                  {(item as any).variantTitle && (item as any).variantTitle !== "Default Title" && (
                    <Text style={[st.itemVariant, { color: sub }, isAr && { textAlign: "right" }]}>
                      {(item as any).variantTitle}
                    </Text>
                  )}
                  <Text style={[st.itemQty, { color: sub }, isAr && { textAlign: "right" }]}>
                    {isAr ? `الكمية: ${(item as any).quantity}` : `Qty: ${(item as any).quantity}`}
                  </Text>
                </View>
                <Text style={[st.itemPrice, { color: textCol }, isAr && { textAlign: "left" }]}>
                  {formatIQD((item as any).price * (item as any).quantity)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Delivery info ── */}
        {(displayName !== "—" || addr.city) && (
          <>
            <SectionLabel text={isAr ? "معلومات التوصيل" : "DELIVERY INFO"} sub={sub} isAr={isAr} />
            <View style={[st.group, { backgroundColor: isWeb ? "transparent" : card }, isWeb && { marginHorizontal: 0, borderRadius: 0, borderTopWidth: 1, borderTopColor: divider, borderBottomWidth: 1, borderBottomColor: divider }]}>
              {(() => {
                const rows: { lbl: string; val: string }[] = [];
                if (displayName !== "—")  rows.push({ lbl: isAr ? "الاسم"               : "NAME",             val: displayName });
                if (addr.instagram)       rows.push({ lbl: "Instagram",                                        val: addr.instagram });
                if (addr.phone)           rows.push({ lbl: isAr ? "رقم تلفون اساسي"    : "PRIMARY PHONE",     val: addr.phone });
                if (addr.phone2)          rows.push({ lbl: isAr ? "رقم تلفون احتياطي"  : "BACKUP PHONE",      val: addr.phone2 });
                if (addr.city)            rows.push({ lbl: isAr ? "المحافظة"            : "GOVERNORATE",       val: addr.city });
                if (addr.district)        rows.push({ lbl: isAr ? "المنطقة / الحي"      : "DISTRICT",          val: addr.district });
                if (addr.landmark)        rows.push({ lbl: isAr ? "أقرب نقطة دالة"      : "LANDMARK",          val: addr.landmark });
                return rows.map((r, i) => (
                  <React.Fragment key={r.lbl}>
                    {i > 0 && <View style={[st.divider, { backgroundColor: divClr }, isWeb && { marginHorizontal: 0 }]} />}
                    <InfoRow label={r.lbl} value={r.val} textCol={textCol} sub={sub} isAr={isAr} />
                  </React.Fragment>
                ));
              })()}
            </View>
          </>
        )}

        {/* ── Order summary ── */}
        <SectionLabel text={isAr ? "ملخص الطلب" : "ORDER SUMMARY"} sub={sub} isAr={isAr} />
        <View style={[st.group, { backgroundColor: isWeb ? "transparent" : card }, isWeb && { marginHorizontal: 0, borderRadius: 0, borderTopWidth: 1, borderTopColor: divider, borderBottomWidth: 1, borderBottomColor: divider }]}>
          <View style={[st.summaryRow, isAr && { flexDirection: "row-reverse" }]}>
            <Text style={[st.summaryLbl, { color: sub }]}>{isAr ? "المجموع الفرعي" : "Subtotal"}</Text>
            <Text style={[st.summaryVal, { color: textCol }]}>{formatIQD((order as any).subtotal ?? order.total)}</Text>
          </View>
          <View style={[st.divider, { backgroundColor: divClr }, isWeb && { marginHorizontal: 0 }]} />
          <View style={[st.summaryRow, isAr && { flexDirection: "row-reverse" }]}>
            <Text style={[st.summaryLbl, { color: sub }]}>{isAr ? "الشحن" : "Shipping"}</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: PRIMARY }}>{isAr ? "مجاني" : "FREE"}</Text>
          </View>
          <View style={[st.divider, { backgroundColor: divClr }, isWeb && { marginHorizontal: 0 }]} />
          <View style={[st.summaryRow, isAr && { flexDirection: "row-reverse" }]}>
            <Text style={[st.summaryLbl, { color: textCol, fontWeight: "700" }]}>{isAr ? "المجموع" : "Total"}</Text>
            <Text style={[st.summaryTotal, { color: PRIMARY }]}>{formatIQD(order.total)}</Text>
          </View>
        </View>

        {/* ── Partial return notice + contact us ── */}
        {isPartialReturn && (
          <View style={{ marginHorizontal: 16, marginTop: 20, borderRadius: 16, borderWidth: 1, borderColor: "#EA580C40", backgroundColor: isDark ? "#EA580C18" : "#EA580C12", padding: 16, gap: 12 }}>
            <View style={{ flexDirection: isAr ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(234,88,12,0.18)", alignItems: "center", justifyContent: "center" }}>
                <Feather name="rotate-ccw" size={17} color="#EA580C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#EA580C", textAlign: isAr ? "right" : "left" }}>
                  {isAr ? "تم إرجاع جزء من الطلب" : "Part of this order was returned"}
                </Text>
                <Text style={{ fontSize: 11, color: sub, marginTop: 2, lineHeight: 16, textAlign: isAr ? "right" : "left" }}>
                  {isAr
                    ? "إذا شفت أي خلل أو مشكلة بالقطع، تواصل ويانا ونساعدك"
                    : "If anything is wrong with your items, contact us and we'll help"}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push("/(tabs)/chat" as any)}
              style={({ pressed }) => ({
                flexDirection: isAr ? "row-reverse" : "row",
                alignItems: "center", justifyContent: "center", gap: 8,
                backgroundColor: "#EA580C", borderRadius: 12, paddingVertical: 12,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Feather name="message-circle" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>
                {isAr ? "تواصل معنا" : "Contact Us"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* ── Review section — only after delivery ── */}
        {isDelivered && (
          <>
            <SectionLabel text={isAr ? "تقييم الطلب" : "ORDER REVIEW"} sub={sub} isAr={isAr} />
            <View style={[st.group, { backgroundColor: isWeb ? "transparent" : card }, isWeb && { marginHorizontal: 0, borderRadius: 0, borderTopWidth: 1, borderTopColor: divider, borderBottomWidth: 1, borderBottomColor: divider }]}>
              <View style={{ padding: 18, gap: 14 }}>
                {hasReview ? (
                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: isAr ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(245,158,11,0.15)", alignItems: "center", justifyContent: "center" }}>
                        <Feather name="star" size={18} color="#F59E0B" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: textCol, textAlign: isAr ? "right" : "left" }}>
                          {isAr ? "شكراً على تقييمك!" : "Thank you for your review!"}
                        </Text>
                        <Text style={{ fontSize: 11, color: sub, marginTop: 1, textAlign: isAr ? "right" : "left" }}>
                          {isAr ? `${displayRating} من 5 نجوم` : `${displayRating} out of 5 stars`}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: isAr ? "flex-end" : "flex-start" }}>
                      <StarRow rating={displayRating} size={24} />
                    </View>
                    {!!displayText && (
                      <View style={{ backgroundColor: inputBg, borderRadius: 10, padding: 12 }}>
                        <Text style={{ fontSize: 13, color: textCol, lineHeight: 20, textAlign: isAr ? "right" : "left" }}>
                          {displayText}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={{ gap: 14 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: textCol, textAlign: isAr ? "right" : "left" }}>
                      {isAr ? "كيف كانت تجربتك؟" : "How was your experience?"}
                    </Text>
                    <Text style={{ fontSize: 12, color: sub, textAlign: isAr ? "right" : "left", marginTop: -8 }}>
                      {isAr ? "رأيك يساعدنا على التحسين" : "Your feedback helps us improve"}
                    </Text>
                    <View style={{ alignItems: isAr ? "flex-end" : "flex-start" }}>
                      <StarRow rating={starRating} size={38} onPress={setStarRating} />
                    </View>
                    <TextInput
                      value={reviewText}
                      onChangeText={setReviewText}
                      placeholder={isAr ? "اكتب رأيك هنا... (اختياري)" : "Write your review... (optional)"}
                      placeholderTextColor={sub}
                      multiline
                      numberOfLines={3}
                      textAlign={isAr ? "right" : "left"}
                      style={[st.reviewInput, { color: textCol, backgroundColor: inputBg, textAlign: isAr ? "right" : "left" }]}
                    />
                    <Pressable
                      onPress={handleSubmitReview}
                      disabled={submitting}
                      style={({ pressed }) => [
                        st.reviewBtn,
                        { backgroundColor: starRating > 0 ? PRIMARY : (isDark ? "#333" : "#DDD") },
                        pressed && { opacity: 0.85 },
                        submitting && { opacity: 0.7 },
                      ]}
                    >
                      {submitting
                        ? <ActivityIndicator color="#fff" size="small" />
                        : (
                          <>
                            <Feather name="send" size={15} color={starRating > 0 ? "#fff" : sub} />
                            <Text style={[st.reviewBtnTxt, { color: starRating > 0 ? "#fff" : sub }]}>
                              {isAr ? "إرسال التقييم" : "Submit Review"}
                            </Text>
                          </>
                        )
                      }
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </>
        )}

        {/* ── Shop again ── */}
        <View style={{ paddingHorizontal: isWeb ? 16 : 16, marginTop: 24 }}>
          <Pressable
            style={({ pressed }) => [st.shopBtn, { backgroundColor: PRIMARY, opacity: pressed ? 0.85 : 1 }, isWeb && { borderRadius: 4 }]}
            onPress={() => router.push("/" as any)}
          >
            <Feather name="shopping-bag" size={16} color="#fff" />
            <Text style={st.shopBtnTxt}>{isAr ? "تسوّق مجدداً" : "SHOP AGAIN"}</Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  header:       { flexDirection: "row", alignItems: "center", paddingBottom: 8 },
  headTitle:    { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" },
  pageTitleWeb: { fontSize: 22, fontWeight: "900", letterSpacing: -0.4, flex: 1, paddingHorizontal: 8 },
  flatBtn:      { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  statusCard:   { margin: 16, borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  statusDot:    { width: 10, height: 10, borderRadius: 5 },
  statusLabel:  { fontSize: 14, fontWeight: "700", letterSpacing: 0.4 },
  statusDate:   { fontSize: 11, marginTop: 3 },
  statusTotal:  { fontSize: 16, fontWeight: "800" },
  sectionLbl:   { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginTop: 20, marginBottom: 8, marginHorizontal: 20 },
  group:        { marginHorizontal: 16, borderRadius: 16, overflow: "hidden" },
  divider:      { height: 1, marginHorizontal: 16 },
  itemRow:      { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  itemImg:      { width: 52, height: 64, borderRadius: 10, overflow: "hidden" },
  itemTitle:    { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  itemVariant:  { fontSize: 11 },
  itemQty:      { fontSize: 11 },
  itemPrice:    { fontSize: 13, fontWeight: "700", minWidth: 80, textAlign: "right" },
  infoRow:      { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  infoLbl:      { fontSize: 12, fontWeight: "500", width: 130, flexShrink: 0 },
  infoVal:      { flex: 1, fontSize: 13, fontWeight: "500" },
  summaryRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  summaryLbl:   { fontSize: 13, fontWeight: "500" },
  summaryVal:   { fontSize: 13, fontWeight: "600" },
  summaryTotal: { fontSize: 16, fontWeight: "800" },
  reviewInput:  { borderRadius: 12, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: "top" },
  reviewBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 48, borderRadius: 50 },
  reviewBtnTxt: { fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  shopBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 52, borderRadius: 50 },
  shopBtnTxt:   { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 0.8 },
});
