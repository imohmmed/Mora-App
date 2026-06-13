import React, { useCallback, useRef } from "react";
import {
  Animated,
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
import Swipeable from "react-native-gesture-handler/Swipeable";
import { useTheme } from "@/context/ThemeContext";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatIQD } from "@/lib/format";
import type { CartItem } from "@/lib/types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── expo-glass-effect (iOS 26+ Liquid Glass — graceful fallback) ───────────────
let GlassViewComp: any = null;
try { GlassViewComp = require("expo-glass-effect").GlassView; } catch {}

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
  const swipeRef = useRef<InstanceType<typeof Swipeable>>(null);
  const card    = isDark ? "#1C1C1E" : "#FFFFFF";
  const textCol = isDark ? "#FFFFFF" : "#1A1A1A";
  const sub     = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)";
  const btnBdr  = isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
    const scale   = progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1], extrapolate: "clamp" });
    const opacity = progress.interpolate({ inputRange: [0, 0.6], outputRange: [0, 1], extrapolate: "clamp" });
    return (
      <View style={cs.swipeOuter}>
        <Pressable style={cs.swipeBtn} onPress={() => { swipeRef.current?.close(); onRemove(); }}>
          <Animated.View style={{ alignItems: "center", transform: [{ scale }], opacity }}>
            <Feather name="trash-2" size={20} color="#fff" />
            <Text style={cs.swipeLbl}>Remove</Text>
          </Animated.View>
        </Pressable>
      </View>
    );
  };

  return (
    <Swipeable
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
    </Swipeable>
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

export default function CartScreen() {
  const { items, subtotal, removeItem, updateQty } = useCart();
  const { user }    = useAuth();
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const { resolvedScheme } = useTheme();
  const isDark      = resolvedScheme === "dark";

  const bg      = isDark ? "#0A0A0A" : "#F2F2F7";
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
      <View style={[s.root, s.center, { backgroundColor: bg, paddingTop: insets.top }]}>
        <View style={[s.emptyCircle, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
          <Feather name="shopping-bag" size={36} color={sub} />
        </View>
        <Text style={[s.emptyTitle, { color: textCol }]}>Your cart is empty</Text>
        <Text style={[s.emptySub, { color: sub }]}>Add items to get started</Text>
        <Pressable style={s.shopBtn} onPress={() => router.push("/(tabs)" as any)}>
          <Text style={s.shopBtnTxt}>SHOP NOW</Text>
        </Pressable>
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
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 130 }}
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
      </ScrollView>

      <View style={[
        s.bar,
        {
          backgroundColor: GlassViewComp ? "transparent" : barBg,
          borderTopColor: barBdr,
          paddingBottom: Platform.OS === "web" ? 14 : insets.bottom + 14,
          bottom: Platform.OS === "web" ? 84 : 0,
        },
      ]}>
        {/* Liquid Glass background — expo-glass-effect (iOS 26+) */}
        {GlassViewComp && (
          <GlassViewComp
            style={StyleSheet.absoluteFill}
            glassEffectStyle="regular"
            colorScheme={isDark ? "dark" : "light"}
          />
        )}
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
  checkBtn:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#111", paddingHorizontal: 22, paddingVertical: 14, borderRadius: 50 },
  checkTxt:    { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 0.6 },
  emptyCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle:  { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  emptySub:    { fontSize: 14, marginBottom: 36 },
  shopBtn:     { backgroundColor: "#111", paddingHorizontal: 36, paddingVertical: 14, borderRadius: 50 },
  shopBtnTxt:  { color: "#fff", fontSize: 14, fontWeight: "700", letterSpacing: 1 },
});
