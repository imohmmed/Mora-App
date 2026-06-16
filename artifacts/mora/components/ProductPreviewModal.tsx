/**
 * ProductPreviewModal — Telegram-style long-press product preview.
 *
 * Appears when user long-presses a product card. Shows a floating product
 * card with image, info, and two actions: Add to Bag / View Product.
 * Tapping the dark backdrop closes it.
 */
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { LiquidGlassBg, isIOS26Plus } from "@/components/LiquidGlassBg";
import { formatIQD } from "@/lib/format";
import type { Product } from "@/lib/types";

const { width: SW, height: SH } = Dimensions.get("window");
const CARD_W  = SW - 56;
const IMG_H   = CARD_W * 1.15;
const PRIMARY = "#0274C1";

interface Props {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
  onAddToBag: (product: Product) => void;
  onViewProduct: (product: Product) => void;
}

export function ProductPreviewModal({
  product,
  visible,
  onClose,
  onAddToBag,
  onViewProduct,
}: Props) {
  const { resolvedScheme } = useTheme();
  const colors = useColors();
  const isDark = resolvedScheme === "dark";

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0.88)).current;
  const slideAnim   = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 12, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.88, duration: 160, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 40, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!product) return null;

  const imageUri   = product.images?.[0];
  const hasDisc    = product.comparePrice != null && product.comparePrice > product.price;
  const cardBg     = isDark ? "#1C1C1E" : "#FFFFFF";
  const textPri    = isDark ? "#FFFFFF" : "#000000";
  const textMuted  = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.44)";

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* ── Backdrop ──────────────────────────────────────────────────────────── */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* ── Floating card ─────────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.cardWrap,
          {
            opacity: backdropAnim,
            transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
          },
        ]}
        pointerEvents={visible ? "box-none" : "none"}
      >
        <View style={[styles.card, {
          backgroundColor: isIOS26Plus ? (isDark ? "rgba(28,28,30,0.55)" : "rgba(255,255,255,0.55)") : cardBg,
          shadowColor: "#000",
        }]}>
          {isIOS26Plus && <LiquidGlassBg style={{ borderRadius: 20 }} />}

          {/* ── Image ── */}
          <View style={[styles.imageBox, { backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7" }]}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <Feather name="shopping-bag" size={60} color={colors.mutedForeground} />
            )}
            {hasDisc && (
              <View style={styles.saleBadge}>
                <Text style={styles.saleBadgeText}>SALE</Text>
              </View>
            )}
          </View>

          {/* ── Info ── */}
          <View style={styles.info}>
            <Text style={[styles.vendor, { color: textMuted }]}>
              {product.vendor ?? "Mora"}
            </Text>
            <Text style={[styles.title, { color: textPri }]} numberOfLines={2}>
              {product.title}
            </Text>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: textPri }]}>
                {formatIQD(product.price)}
              </Text>
              {hasDisc && (
                <Text style={styles.comparePrice}>
                  {formatIQD(product.comparePrice!)}
                </Text>
              )}
            </View>
          </View>

          {/* ── Actions ── */}
          <View style={[styles.actions, { borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)" }]}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: pressed ? "rgba(0,0,0,0.05)" : "transparent" },
              ]}
              onPress={() => { onAddToBag(product); onClose(); }}
            >
              <Feather name="shopping-bag" size={18} color={PRIMARY} />
              <Text style={[styles.actionText, { color: PRIMARY }]}>Add to Bag</Text>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)" }]} />

            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: pressed ? "rgba(0,0,0,0.05)" : "transparent" },
              ]}
              onPress={() => { onViewProduct(product); onClose(); }}
            >
              <Feather name="eye" size={18} color={textPri} />
              <Text style={[styles.actionText, { color: textPri }]}>View Product</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Close hint ── */}
        <Pressable onPress={onClose} style={styles.closeHint}>
          <View style={styles.closeBtn}>
            <Feather name="x" size={20} color="#FFFFFF" />
          </View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  cardWrap: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: CARD_W,
    borderRadius: 20,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 32,
    elevation: 24,
  },
  imageBox: {
    width: "100%",
    height: IMG_H,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  saleBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "#E53935",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  saleBadgeText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  info: {
    padding: 18,
    gap: 4,
  },
  vendor: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    lineHeight: 22,
  },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  price: { fontFamily: "Inter_700Bold", fontSize: 18 },
  comparePrice: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textDecorationLine: "line-through",
    color: "#E53935",
  },
  actions: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  actionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  divider: { width: 1, marginVertical: 12 },
  closeHint: { marginTop: 16 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
});
