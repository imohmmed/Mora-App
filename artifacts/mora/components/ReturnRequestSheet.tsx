import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useExchange } from "@/context/ExchangeContext";
import {
  createExchangeRequest,
  uploadReturnImage,
  type ExchangeItem,
} from "@/lib/api";
import { formatIQD } from "@/lib/format";
import type { Order, OrderItem } from "@/lib/types";

const PRIMARY = "#0274C1";
const RED = "#DC2626";

type Props = {
  visible: boolean;
  onClose: () => void;
  order: Order;
  isAr: boolean;
  isDark: boolean;
};

type PickedImage = { uri: string; name: string; type: string; uploading: boolean; url?: string };

export function ReturnRequestSheet({ visible, onClose, order, isAr, isDark }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();
  const { startExchange } = useExchange();

  const bg      = isDark ? "#141414" : "#FFFFFF";
  const card    = isDark ? "#1C1C1E" : "#F4F4F5";
  const textCol = isDark ? "#FFFFFF" : "#1A1A1A";
  const sub     = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const border  = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";

  const [step, setStep] = useState<1 | 2>(1);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<PickedImage[]>([]);
  const [qtyByLine, setQtyByLine] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState<"exchange" | "refund" | null>(null);
  const [done, setDone] = useState<"refund" | null>(null);

  const lineItems: OrderItem[] = order.lineItems ?? [];

  const uploadedUrls = useMemo(
    () => images.filter((im) => im.url).map((im) => im.url!) as string[],
    [images],
  );
  const anyUploading = images.some((im) => im.uploading);
  const step1Valid = description.trim().length > 0 && uploadedUrls.length > 0 && !anyUploading;

  const selectedItems: ExchangeItem[] = useMemo(() => {
    return lineItems
      .map((li, idx) => {
        const key = `${li.id || li.variantId || idx}`;
        const qty = qtyByLine[key] ?? 0;
        if (qty <= 0) return null;
        return {
          variantId: li.variantId ?? "",
          productId: li.productId ?? "",
          title: li.title,
          variantTitle: li.variantTitle ?? "",
          image: li.image ?? "",
          price: li.price,
          quantity: qty,
        };
      })
      .filter(Boolean) as ExchangeItem[];
  }, [lineItems, qtyByLine]);

  const reset = () => {
    setStep(1);
    setDescription("");
    setImages([]);
    setQtyByLine({});
    setSubmitting(null);
    setDone(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const pickImages = async () => {
    if (!token) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 6 - images.length,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const picked: PickedImage[] = result.assets.slice(0, 6 - images.length).map((a, i) => ({
      uri: a.uri,
      name: a.fileName ?? `photo_${Date.now()}_${i}.jpg`,
      type: a.mimeType ?? "image/jpeg",
      uploading: true,
    }));
    setImages((prev) => [...prev, ...picked]);

    for (const im of picked) {
      try {
        const url = await uploadReturnImage(token, { uri: im.uri, name: im.name, type: im.type });
        setImages((prev) => prev.map((p) => (p.uri === im.uri ? { ...p, uploading: false, url } : p)));
      } catch {
        setImages((prev) => prev.filter((p) => p.uri !== im.uri));
        Alert.alert(
          isAr ? "خطأ" : "Error",
          isAr ? "فشل رفع الصورة، حاول مجدداً" : "Image upload failed, try again",
        );
      }
    }
  };

  const removeImage = (uri: string) => setImages((prev) => prev.filter((p) => p.uri !== uri));

  const setQty = (key: string, max: number, delta: number) => {
    setQtyByLine((prev) => {
      const next = Math.min(max, Math.max(0, (prev[key] ?? 0) + delta));
      return { ...prev, [key]: next };
    });
  };

  const submit = async (type: "exchange" | "refund") => {
    if (!token || selectedItems.length === 0 || submitting) return;
    setSubmitting(type);
    try {
      const request = await createExchangeRequest(token, {
        orderId: order.id,
        type,
        description: description.trim(),
        images: uploadedUrls,
        items: selectedItems,
      });
      if (type === "exchange") {
        startExchange({ requestId: request.id, orderNumber: order.orderNumber ?? "", customerId: user?.id ?? "" });
        close();
        router.push("/(tabs)/(home)" as any);
      } else {
        setDone("refund");
      }
    } catch (e) {
      Alert.alert(
        isAr ? "خطأ" : "Error",
        e instanceof Error && e.message && e.message !== "Unauthorized"
          ? e.message
          : isAr ? "حدث خطأ، حاول مجدداً" : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={st.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={close} />
        <View style={[st.sheet, { backgroundColor: bg, paddingBottom: insets.bottom + 16, maxHeight: "88%" }]}>
          {/* handle + header */}
          <View style={st.handle} />
          <View style={[st.headerRow, isAr && { flexDirection: "row-reverse" }]}>
            <Text style={[st.title, { color: textCol, textAlign: isAr ? "right" : "left" }]}>
              {done === "refund"
                ? (isAr ? "تم إرسال الطلب" : "Request Sent")
                : (isAr ? "استبدال وترجيع" : "Exchange & Refund")}
            </Text>
            <Pressable onPress={close} hitSlop={10} style={[st.closeBtn, { backgroundColor: inputBg }]}>
              <Feather name="x" size={18} color={textCol} />
            </Pressable>
          </View>

          {done === "refund" ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 16, alignItems: "center" }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(34,197,94,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Feather name="check" size={30} color="#22C55E" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: textCol, textAlign: "center" }}>
                {isAr ? "استلمنا طلب الترجيع" : "We received your refund request"}
              </Text>
              <Text style={{ fontSize: 13, color: sub, textAlign: "center", lineHeight: 20 }}>
                {isAr
                  ? "راح نراجع الطلب ونتواصل وياك خلال يومين كحد أقصى"
                  : "We'll review it and contact you within 2 days at most"}
              </Text>
              <Pressable onPress={close} style={[st.primaryBtn, { backgroundColor: PRIMARY, alignSelf: "stretch" }]}>
                <Text style={st.primaryBtnTxt}>{isAr ? "تم" : "Done"}</Text>
              </Pressable>
            </View>
          ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
          >
            {/* step indicator */}
            <View style={[st.stepsRow, isAr && { flexDirection: "row-reverse" }]}>
              {[1, 2].map((s) => (
                <View key={s} style={[st.stepPill, { backgroundColor: step >= s ? PRIMARY : inputBg }]}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: step >= s ? "#fff" : sub }}>
                    {s === 1 ? (isAr ? "١. المشكلة" : "1. Problem") : (isAr ? "٢. القطع" : "2. Items")}
                  </Text>
                </View>
              ))}
            </View>

            {step === 1 ? (
              <View style={{ gap: 14, marginTop: 4 }}>
                <Text style={{ fontSize: 13, color: sub, textAlign: isAr ? "right" : "left", lineHeight: 20 }}>
                  {isAr
                    ? "اكتب وصف المشكلة وارفق صور القطع — الوصف والصور مطلوبة حتى نكدر نساعدك"
                    : "Describe the problem and attach photos of the items — both are required"}
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder={isAr ? "اكتب وصف المشكلة هنا..." : "Describe the problem..."}
                  placeholderTextColor={sub}
                  multiline
                  numberOfLines={4}
                  style={[st.input, { color: textCol, backgroundColor: inputBg, textAlign: isAr ? "right" : "left" }]}
                />
                {/* photos */}
                <View style={{ flexDirection: isAr ? "row-reverse" : "row", flexWrap: "wrap", gap: 10 }}>
                  {images.map((im) => (
                    <View key={im.uri} style={[st.thumb, { backgroundColor: card }]}>
                      <Image source={{ uri: im.uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                      {im.uploading && (
                        <View style={st.thumbOverlay}>
                          <ActivityIndicator color="#fff" size="small" />
                        </View>
                      )}
                      {!im.uploading && (
                        <Pressable onPress={() => removeImage(im.uri)} style={st.thumbRemove} hitSlop={8}>
                          <Feather name="x" size={12} color="#fff" />
                        </Pressable>
                      )}
                    </View>
                  ))}
                  {images.length < 6 && (
                    <Pressable onPress={pickImages} style={[st.thumb, st.addThumb, { borderColor: border }]}>
                      <Feather name="camera" size={20} color={sub} />
                      <Text style={{ fontSize: 10, color: sub, marginTop: 4 }}>
                        {isAr ? "إضافة صور" : "Add photos"}
                      </Text>
                    </Pressable>
                  )}
                </View>
                <Pressable
                  onPress={() => step1Valid && setStep(2)}
                  disabled={!step1Valid}
                  style={[st.primaryBtn, { backgroundColor: step1Valid ? PRIMARY : (isDark ? "#333" : "#DDD") }]}
                >
                  <Text style={[st.primaryBtnTxt, !step1Valid && { color: sub }]}>
                    {isAr ? "التالي" : "Next"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 12, marginTop: 4 }}>
                <Text style={{ fontSize: 13, color: sub, textAlign: isAr ? "right" : "left", lineHeight: 20 }}>
                  {isAr
                    ? "اختر القطع والعدد اللي تريد استبدالها أو ترجيعها"
                    : "Select the items and quantity to exchange or refund"}
                </Text>
                {lineItems.map((li, idx) => {
                  const key = `${li.id || li.variantId || idx}`;
                  const qty = qtyByLine[key] ?? 0;
                  return (
                    <View key={key} style={[st.itemRow, { backgroundColor: card }, isAr && { flexDirection: "row-reverse" }]}>
                      {li.image ? (
                        <Image source={{ uri: li.image }} style={st.itemImg} resizeMode="cover" />
                      ) : (
                        <View style={[st.itemImg, { backgroundColor: inputBg }]} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: "600", color: textCol, textAlign: isAr ? "right" : "left" }}>
                          {li.title}
                        </Text>
                        {!!li.variantTitle && (
                          <Text style={{ fontSize: 11, color: sub, marginTop: 2, textAlign: isAr ? "right" : "left" }}>
                            {li.variantTitle}
                          </Text>
                        )}
                        <Text style={{ fontSize: 11, color: sub, marginTop: 2, textAlign: isAr ? "right" : "left" }}>
                          {formatIQD(li.price)} · {isAr ? `الكمية ${li.quantity}` : `Qty ${li.quantity}`}
                        </Text>
                      </View>
                      <View style={[st.qtyBox, { backgroundColor: inputBg }, isAr && { flexDirection: "row-reverse" }]}>
                        <Pressable onPress={() => setQty(key, li.quantity, -1)} hitSlop={8} style={st.qtyBtn}>
                          <Feather name="minus" size={14} color={qty > 0 ? textCol : sub} />
                        </Pressable>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: qty > 0 ? PRIMARY : sub, minWidth: 18, textAlign: "center" }}>
                          {qty}
                        </Text>
                        <Pressable onPress={() => setQty(key, li.quantity, 1)} hitSlop={8} style={st.qtyBtn}>
                          <Feather name="plus" size={14} color={qty < li.quantity ? textCol : sub} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}

                <View style={{ flexDirection: isAr ? "row-reverse" : "row", gap: 10, marginTop: 6 }}>
                  <Pressable
                    onPress={() => submit("exchange")}
                    disabled={selectedItems.length === 0 || !!submitting}
                    style={[st.primaryBtn, { flex: 1, backgroundColor: selectedItems.length > 0 ? PRIMARY : (isDark ? "#333" : "#DDD") }]}
                  >
                    {submitting === "exchange"
                      ? <ActivityIndicator color="#fff" size="small" />
                      : (
                        <Text style={[st.primaryBtnTxt, selectedItems.length === 0 && { color: sub }]}>
                          {isAr ? "استبدال" : "Exchange"}
                        </Text>
                      )}
                  </Pressable>
                  <Pressable
                    onPress={() => submit("refund")}
                    disabled={selectedItems.length === 0 || !!submitting}
                    style={[st.primaryBtn, { flex: 1, backgroundColor: selectedItems.length > 0 ? RED : (isDark ? "#333" : "#DDD") }]}
                  >
                    {submitting === "refund"
                      ? <ActivityIndicator color="#fff" size="small" />
                      : (
                        <Text style={[st.primaryBtnTxt, selectedItems.length === 0 && { color: sub }]}>
                          {isAr ? "ترجيع" : "Refund"}
                        </Text>
                      )}
                  </Pressable>
                </View>
                <Pressable onPress={() => setStep(1)} style={{ alignSelf: "center", padding: 8 }}>
                  <Text style={{ fontSize: 13, color: sub, fontWeight: "600" }}>
                    {isAr ? "رجوع" : "Back"}
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet:        { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8 },
  handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(128,128,128,0.35)", alignSelf: "center", marginBottom: 10 },
  headerRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 },
  title:        { fontSize: 18, fontWeight: "800", flex: 1 },
  closeBtn:     { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  stepsRow:     { flexDirection: "row", gap: 8, marginBottom: 14 },
  stepPill:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  input:        { borderRadius: 12, padding: 12, fontSize: 14, minHeight: 90, textAlignVertical: "top" },
  thumb:        { width: 76, height: 76, borderRadius: 12, overflow: "hidden" },
  addThumb:     { borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  thumbOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  thumbRemove:  { position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  itemRow:      { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14 },
  itemImg:      { width: 46, height: 58, borderRadius: 8 },
  qtyBox:       { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 6 },
  qtyBtn:       { width: 22, height: 22, alignItems: "center", justifyContent: "center" },
  primaryBtn:   { height: 48, borderRadius: 50, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  primaryBtnTxt:{ color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 0.3 },
});
