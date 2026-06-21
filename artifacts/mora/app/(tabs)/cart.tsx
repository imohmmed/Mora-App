import React, { useCallback, useRef, useState } from "react";
import { LiquidGlassBg, isIOS26Plus } from "@/components/LiquidGlassBg";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { fetchStories, fetchSpecialCollection } from "@/lib/api";
import { formatIQD } from "@/lib/format";
import { StoriesSection } from "@/components/StoriesSection";
import { QuickAddSheet } from "@/components/QuickAddSheet";
import type { CartItem, Product, Variant } from "@/lib/types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


const PRIMARY = "#0274C1";

function StepIndicator({ current, isDark }: { current: 1 | 2 | 3; isDark: boolean }) {
  const steps = ["Cart", "Checkout", "Done"];
  const inactiveCircle = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";
  const inactiveText   = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
  const inactiveLine   = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";

  return (
    <View style={si.container}>
      {steps.map((label, i) => {
        const step   = i + 1;
        const done   = step < current;
        const active = step === current;
        return (
          <React.Fragment key={label}>
            <View style={si.stepWrap}>
              <View style={[si.circle, {
                backgroundColor: active || done ? PRIMARY : "transparent",
                borderColor: active || done ? PRIMARY : inactiveCircle,
              }]}>
                {done
                  ? <Feather name="check" size={11} color="#fff" />
                  : <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "#fff" : inactiveText }}>{step}</Text>
                }
              </View>
              <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase",
                color: active ? PRIMARY : inactiveText, marginTop: 5 }}>
                {label}
              </Text>
            </View>
            {i < 2 && <View style={[si.line, { backgroundColor: step < current ? PRIMARY : inactiveLine }]} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const si = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", paddingHorizontal: 30, marginTop: 10, marginBottom: 4 },
  stepWrap:  { alignItems: "center" },
  circle:    { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  line:      { flex: 1, height: 1.5, marginBottom: 16 },
});

function CartItemRow({
  item,
  isDark,
  onRemove,
  onInc,
  onDec,
}: {
  item: CartItem;
  isDark: boolean;
  onRemove: () => void;
  onInc: () => void;
  onDec: () => void;
}) {
  const swipeRef = useRef<SwipeableMethods>(null);
  const card    = isDark ? "#1C1C1E" : "#FFFFFF";
  const textCol = isDark ? "#FFFFFF" : "#1A1A1A";
  const sub     = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)";
  const btnBdr  = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";

  const renderRightActions = (progress: SharedValue<number>) => {
    const AnimatedContent = () => {
      const style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(progress.value, [0, 1], [0.6, 1], "clamp") }],
        opacity: interpolate(progress.value, [0, 0.6], [0, 1], "clamp"),
        alignItems: "center" as const,
      }));
      return (
        <View style={cs.swipeOuter}>
          <Pressable style={cs.swipeBtn} onPress={() => { swipeRef.current?.close(); onRemove(); }}>
            <Animated.View style={style}>
              <Feather name="trash-2" size={20} color="#fff" />
              <Text style={cs.swipeLbl}>Remove</Text>
            </Animated.View>
          </Pressable>
        </View>
      );
    };
    return <AnimatedContent />;
  };

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      <View style={[cs.card, { backgroundColor: card }]}>
        <View style={cs.imgWrap}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={cs.img} contentFit="cover" />
          ) : (
            <View style={[cs.img, { backgroundColor: isDark ? "#2C2C2E" : "#F0F0F0", alignItems: "center", justifyContent: "center" }]}>
              <Feather name="image" size={22} color={sub} />
            </View>
          )}
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[cs.titleTxt, { color: textCol }]} numberOfLines={2}>{item.title}</Text>
          {(item.size || item.color) && (
            <Text style={{ fontSize: 11, color: sub }}>
              {[item.size, item.color].filter(Boolean).join("  ·  ")}
            </Text>
          )}
          <Text style={cs.price}>{formatIQD(item.price)}</Text>
        </View>

        <View style={cs.qtyCol}>
          <Pressable onPress={onInc} style={[cs.qBtn, { borderColor: btnBdr }]} hitSlop={8}>
            <Feather name="plus" size={13} color={textCol} />
          </Pressable>
          <Text style={[cs.qtyNum, { color: textCol }]}>{item.quantity}</Text>
          <Pressable onPress={onDec} style={[cs.qBtn, { borderColor: btnBdr }]} hitSlop={8}>
            <Feather name={item.quantity === 1 ? "trash-2" : "minus"} size={13}
              color={item.quantity === 1 ? "#FF3B30" : textCol} />
          </Pressable>
        </View>
      </View>
    </ReanimatedSwipeable>
  );
}

const cs = StyleSheet.create({
  card:      { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14, marginHorizontal: 16, marginBottom: 8, borderRadius: 18 },
  imgWrap:   { width: 72, height: 90, borderRadius: 12, overflow: "hidden", flexShrink: 0 },
  img:       { width: "100%", height: "100%" },
  titleTxt:  { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  price:     { fontSize: 14, fontWeight: "700", color: PRIMARY, marginTop: 2 },
  qtyCol:    { alignItems: "center", gap: 8 },
  qBtn:      { width: 28, height: 28, borderRadius: 14, borderWidth: 1.2, alignItems: "center", justifyContent: "center" },
  qtyNum:    { fontSize: 14, fontWeight: "700", minWidth: 18, textAlign: "center" },
  swipeOuter:{ width: 80, marginBottom: 8, marginRight: 16 },
  swipeBtn:  { flex: 1, backgroundColor: "#FF3B30", borderRadius: 18, alignItems: "center", justifyContent: "center" },
  swipeLbl:  { color: "#fff", fontSize: 10, fontWeight: "600", marginTop: 4 },
});

const GIFT_CARD_W = 130;

function GiftWrapSection({ lang, isDark }: { lang: string; isDark: boolean }) {
  const { addItem } = useCart();
  const router      = useRouter();
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);

  const { data } = useQuery({
    queryKey: ["gift-wrapping"],
    queryFn:  () => fetchSpecialCollection("gift-wrapping"),
    retry: false,
    staleTime: 300_000,
  });

  const products = data?.products ?? [];
  if (products.length === 0) return null;

  const sectionBg  = isDark ? "#1A1A1A" : "#F7F7F8";
  const cardBg     = isDark ? "#2C2C2E" : "#FFFFFF";
  const textCol    = isDark ? "#FFFFFF" : "#1A1A1A";
  const sub        = isDark ? "rgba(255,255,255,0.42)" : "rgba(0,0,0,0.4)";
  const title      = lang === "ar" ? "ارسال الطلب كهدية" : "Buy As a Gift";
  const subtitle   = lang === "ar" ? "أضف تغليف للطلب وسنرسله كهدية" : "Add wrapping and we'll send it as a gift";

  const handleConfirm = (variant: Variant) => {
    if (!quickAddProduct) return;
    addItem({
      productId: quickAddProduct.id,
      variantId: variant.id,
      title:     quickAddProduct.title,
      vendor:    quickAddProduct.vendor ?? "",
      price:     variant.price ?? quickAddProduct.price,
      quantity:  1,
      size:      variant.option1 ?? undefined,
      color:     variant.option2 ?? undefined,
      image:     quickAddProduct.images?.[0],
    });
    setQuickAddProduct(null);
  };

  return (
    <View style={[gw.wrap, { backgroundColor: sectionBg }]}>
      <View style={gw.headerRow}>
        <View style={gw.iconCircle}>
          <Feather name="gift" size={16} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[gw.title, { color: textCol }]}>{title}</Text>
          <Text style={[gw.subtitle, { color: sub }]}>{subtitle}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={gw.scroll}
        decelerationRate="fast"
        snapToInterval={GIFT_CARD_W + 10}
      >
        {products.map((product) => (
          <View key={product.id} style={[gw.card, { backgroundColor: cardBg }]}>
            <Pressable
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              onPress={() => router.push(`/product/${product.id}` as any)}
            >
              <Image
                source={{ uri: product.images?.[0] ?? "" }}
                style={gw.img}
                contentFit="cover"
              />
              <Text style={[gw.cardName, { color: textCol }]} numberOfLines={2}>
                {product.title}
              </Text>
              <Text style={gw.cardPrice}>{formatIQD(product.price)}</Text>
            </Pressable>
            <Pressable
              style={gw.addBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setQuickAddProduct(product);
              }}
            >
              <Text style={gw.addBtnTxt}>{lang === "ar" ? "أضف" : "ADD"}</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <QuickAddSheet
        visible={!!quickAddProduct}
        product={quickAddProduct}
        onClose={() => setQuickAddProduct(null)}
        onConfirm={handleConfirm}
      />
    </View>
  );
}

const gw = StyleSheet.create({
  wrap:       { marginTop: 6, marginBottom: 6, paddingVertical: 16 },
  headerRow:  { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, marginBottom: 14 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: PRIMARY, alignItems: "center", justifyContent: "center" },
  title:      { fontSize: 15, fontWeight: "700", letterSpacing: -0.2 },
  subtitle:   { fontSize: 11, marginTop: 2 },
  scroll:     { paddingHorizontal: 16, gap: 10 },
  card:       { width: GIFT_CARD_W, borderRadius: 14, overflow: "hidden", padding: 0 },
  img:        { width: GIFT_CARD_W, height: GIFT_CARD_W * 1.2, borderRadius: 10 },
  cardName:   { fontSize: 11, fontWeight: "600", lineHeight: 15, marginTop: 8, paddingHorizontal: 6 },
  cardPrice:  { fontSize: 12, fontWeight: "700", color: PRIMARY, marginTop: 3, paddingHorizontal: 6 },
  addBtn:     { backgroundColor: PRIMARY, marginHorizontal: 6, marginTop: 8, marginBottom: 6, paddingVertical: 8, borderRadius: 50, alignItems: "center" },
  addBtnTxt:  { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
});

export default function CartScreen() {
  const { items, subtotal, removeItem, updateQty } = useCart();
  const { user }    = useAuth();
  const { lang }    = useLanguage();
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const { resolvedScheme } = useTheme();
  const isDark      = resolvedScheme === "dark";

  const { data: storyData, isLoading: storiesLoading } = useQuery({
    queryKey: ["cart-stories"],
    queryFn:  fetchStories,
    enabled:  items.length === 0,
    staleTime: 120_000,
  });
  const storyRows = storyData ?? [];

  const bg      = isDark ? "#0A0A0A" : "#FFFFFF";
  const textCol = isDark ? "#FFFFFF" : "#1A1A1A";
  const sub     = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)";
  const barBg   = isDark ? "rgba(14,14,14,0.97)" : "rgba(255,255,255,0.97)";
  const barBdr  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  const handleRemove = useCallback((productId: string, variantId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeItem(productId, variantId);
  }, [removeItem]);

  const handleDec = useCallback((productId: string, variantId: string, qty: number) => {
    if (qty <= 1) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      removeItem(productId, variantId);
    } else {
      Haptics.selectionAsync();
      updateQty(productId, variantId, -1);
    }
  }, [removeItem, updateQty]);

  const handleInc = useCallback((productId: string, variantId: string) => {
    Haptics.selectionAsync();
    updateQty(productId, variantId, 1);
  }, [updateQty]);

  const handleCheckout = () => {
    if (!user) {
      router.push({ pathname: "/auth", params: { returnTo: "/checkout" } });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/checkout");
  };

  if (items.length === 0) {
    return (
      <View style={[s.root, { backgroundColor: bg, paddingTop: insets.top }]}>
        <View style={[s.header, { paddingTop: 6 }]}>
          <Text style={[s.pageTitle, { color: textCol }]}>
            {lang === "ar" ? "سلتي" : "MY CART"}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          <View style={s.emptyBanner}>
            <Feather name="shopping-bag" size={20} color={sub} />
            <Text style={[s.emptyBannerTxt, { color: sub }]}>
              {lang === "ar"
                ? "سلتك فارغة — تصفح المجموعات أدناه"
                : "Cart is empty — browse collections below"}
            </Text>
          </View>

          {storiesLoading ? (
            <ActivityIndicator color={PRIMARY} style={{ marginTop: 48 }} />
          ) : (
            <StoriesSection rows={storyRows} />
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 6 }]}>
        <Text style={[s.pageTitle, { color: textCol }]}>MY CART</Text>
        <View style={s.badge}>
          <Text style={s.badgeTxt}>{totalQty}</Text>
        </View>
      </View>

      <StepIndicator current={1} isDark={isDark} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: insets.bottom + 54 + 96 }}
      >
        {items.map((item) => (
          <CartItemRow
            key={`${item.productId}-${item.variantId}`}
            item={item}
            isDark={isDark}
            onRemove={() => handleRemove(item.productId, item.variantId)}
            onInc={() => handleInc(item.productId, item.variantId)}
            onDec={() => handleDec(item.productId, item.variantId, item.quantity)}
          />
        ))}

        <GiftWrapSection lang={lang} isDark={isDark} />
      </ScrollView>

      <View style={[
        s.bar,
        {
          backgroundColor: isIOS26Plus ? "transparent" : barBg,
          borderTopColor: isIOS26Plus ? "transparent" : barBdr,
          borderTopWidth: isIOS26Plus ? 0 : 1,
          paddingBottom: 14,
          bottom: Platform.OS === "web" ? 84 : insets.bottom + 54,
        },
      ]}>
        {/* iOS 26 Liquid Glass background */}
        <LiquidGlassBg />

        <View style={{ flex: 1 }}>
          <Text style={[s.barLabel, { color: sub }]}>Subtotal</Text>
          <Text style={[s.barTotal, { color: textCol }]}>{formatIQD(subtotal)}</Text>
        </View>
        <Pressable
          onPress={handleCheckout}
          style={({ pressed }) => [s.checkBtn, pressed && { opacity: 0.82 }]}
        >
          <Text style={s.checkTxt}>CHECKOUT</Text>
          <Feather name="arrow-right" size={15} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  center:      { alignItems: "center", justifyContent: "center" },
  header:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 2, gap: 10 },
  pageTitle:   { fontSize: 22, fontWeight: "800", letterSpacing: -0.5, flex: 1 },
  badge:       { backgroundColor: PRIMARY, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt:    { color: "#fff", fontSize: 12, fontWeight: "700" },
  bar:         { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  barLabel:    { fontSize: 11, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  barTotal:    { fontSize: 18, fontWeight: "800", letterSpacing: -0.4 },
  checkBtn:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: PRIMARY, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 50 },
  checkTxt:    { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 0.6 },
  emptyBanner:    { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 14, marginTop: 4 },
  emptyBannerTxt: { fontSize: 13, fontWeight: "500", flex: 1 },
});
