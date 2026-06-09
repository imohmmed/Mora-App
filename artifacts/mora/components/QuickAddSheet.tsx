/**
 * QuickAddSheet — slides up when user taps ADD TO BAG.
 * Shows available sizes from product variants and lets the user pick one.
 * After picking, the caller receives the selected Variant via onConfirm().
 */

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/context/ThemeContext";
import type { Product, Variant } from "@/lib/types";

const PRIMARY = "#0274C1";

interface Props {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirm: (variant: Variant) => void;
}

export function QuickAddSheet({ visible, product, onClose, onConfirm }: Props) {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";

  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  // Reset selection when product changes
  useEffect(() => {
    setSelectedVariantId(null);
  }, [product?.id]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 220, useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0, tension: 60, friction: 14, useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0, duration: 180, useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 500, duration: 180, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!product) return null;

  const variants = product.variants ?? [];

  // Deduplicate sizes by option1
  const hasSizes = variants.some((v) => v.option1 && v.option1 !== "Default Title");
  const sizeVariants: Variant[] = hasSizes
    ? variants.filter((v, idx, arr) =>
        v.option1 && arr.findIndex((x) => x.option1 === v.option1) === idx
      )
    : [];

  const selectedVariant = selectedVariantId
    ? (variants.find((v) => v.id === selectedVariantId) ?? null)
    : null;

  const canAdd = !hasSizes || selectedVariant !== null;

  const handleSizePress = (variant: Variant) => {
    setSelectedVariantId(variant.id);
  };

  const handleAddToBag = () => {
    const variantToAdd = selectedVariant ?? variants[0];
    if (!variantToAdd) return;
    onConfirm(variantToAdd);
    onClose();
  };

  // ── colours ──────────────────────────────────────────────────────────────
  const bg         = isDark ? "#1C1C1E" : "#FFFFFF";
  const handleCol  = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)";
  const textPri    = isDark ? "#FFFFFF" : "#000000";
  const textMuted  = isDark ? "rgba(255,255,255,0.50)" : "rgba(0,0,0,0.44)";
  const chipBg     = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.05)";
  const chipBorder = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)";
  const imageBg    = isDark ? "#2C2C2E" : "#F2F2F7";

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: fadeAnim }]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: bg, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: handleCol }]} />

        {/* ── Product mini header ────────────────────────────────────── */}
        <View style={styles.productRow}>
          <View style={[styles.thumbBox, { backgroundColor: imageBg }]}>
            {product.images?.[0] ? (
              <Image
                source={{ uri: product.images[0] }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={150}
              />
            ) : null}
          </View>
          <View style={styles.productMeta}>
            <Text style={[styles.vendorText, { color: textMuted }]}>
              {product.vendor ?? "Mora"}
            </Text>
            <Text style={[styles.titleText, { color: textPri }]} numberOfLines={2}>
              {product.title}
            </Text>
            <Text style={[styles.priceText, { color: PRIMARY }]}>
              ${product.price.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* ── Size picker ────────────────────────────────────────────── */}
        {hasSizes && (
          <>
            <Text style={[styles.sectionLabel, { color: textMuted }]}>
              {selectedVariant ? `SIZE — ${selectedVariant.option1}` : "SELECT SIZE"}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sizeRow}
            >
              {sizeVariants.map((v) => {
                const isSelected = selectedVariantId === v.id;
                const outOfStock = v.inventory === 0;
                return (
                  <Pressable
                    key={v.id}
                    style={({ pressed }) => [
                      styles.sizeChip,
                      {
                        backgroundColor: isSelected ? PRIMARY : chipBg,
                        borderColor: isSelected ? PRIMARY : chipBorder,
                        opacity: outOfStock ? 0.38 : pressed ? 0.75 : 1,
                      },
                    ]}
                    onPress={() => !outOfStock && handleSizePress(v)}
                    disabled={outOfStock}
                  >
                    <Text
                      style={[
                        styles.sizeChipText,
                        { color: isSelected ? "#FFFFFF" : textPri },
                      ]}
                    >
                      {v.option1}
                    </Text>
                    {outOfStock && (
                      <View style={styles.strikeThrough} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* ── Add button ─────────────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: canAdd ? PRIMARY : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"),
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={handleAddToBag}
          disabled={!canAdd}
        >
          <Text
            style={[
              styles.addBtnText,
              { color: canAdd ? "#FFFFFF" : textMuted },
            ]}
          >
            {hasSizes && !selectedVariant ? "SELECT A SIZE" : "ADD TO BAG"}
          </Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  productRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 24,
  },
  thumbBox: {
    width: 72,
    height: 88,
    borderRadius: 8,
    overflow: "hidden",
  },
  productMeta: {
    flex: 1,
    gap: 3,
    justifyContent: "center",
  },
  vendorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  titleText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    lineHeight: 20,
  },
  priceText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 12,
  },
  sizeRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
    marginBottom: 24,
  },
  sizeChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 52,
    position: "relative",
    overflow: "hidden",
  },
  sizeChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  strikeThrough: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(150,150,150,0.6)",
  },
  addBtn: {
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  addBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
