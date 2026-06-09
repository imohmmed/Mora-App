/**
 * QuickAddSheet — slides up when user taps ADD TO BAG.
 *
 * Dynamically renders a row of chips for every option axis
 * (option1, option2) found on the product's variants.
 * Labels are inferred: size-like values → "SIZE", otherwise
 * the raw axis position is used ("COLOR", "OPTION").
 *
 * Chips that are out-of-stock for the current combination are
 * shown struck-through and disabled.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SIZE_TOKENS = new Set([
  "xxs","xs","s","m","l","xl","xxl","2xl","3xl","4xl","5xl",
  "one size","os","free size",
]);
function inferLabel(values: string[]): string {
  const lower = values.map((v) => v.toLowerCase().trim());
  if (lower.every((v) => SIZE_TOKENS.has(v) || /^\d{2,3}(cm|mm|in|")?$/.test(v))) return "SIZE";
  if (lower.every((v) => /^(red|blue|green|black|white|pink|grey|gray|navy|beige|ivory|camel|tan|brown|purple|yellow|orange|teal|cream|khaki|mint|coral|rose|nude|sand)$/.test(v))) return "COLOR";
  return "OPTION";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickAddSheet({ visible, product, onClose, onConfirm }: Props) {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";

  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const [selectedOpt1, setSelectedOpt1] = useState<string | null>(null);
  const [selectedOpt2, setSelectedOpt2] = useState<string | null>(null);

  // Reset selections whenever the product changes
  useEffect(() => {
    setSelectedOpt1(null);
    setSelectedOpt2(null);
  }, [product?.id]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 14, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 500, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!product) return null;

  const variants = product.variants ?? [];

  // ── Compute option axes ───────────────────────────────────────────────────
  const opt1Values = useMemo(() => (
    [...new Set(variants.map((v) => v.option1).filter((v): v is string => !!v && v !== "Default Title"))]
  ), [variants]);

  const opt2Values = useMemo(() => (
    [...new Set(variants.map((v) => v.option2).filter((v): v is string => !!v && v !== "Default Title"))]
  ), [variants]);

  const hasOpt1 = opt1Values.length > 0;
  const hasOpt2 = opt2Values.length > 0;

  const label1 = useMemo(() => inferLabel(opt1Values), [opt1Values]);
  const label2 = useMemo(() => inferLabel(opt2Values), [opt2Values]);

  // ── Find matching variant ─────────────────────────────────────────────────
  const selectedVariant: Variant | null = useMemo(() => {
    if (hasOpt1 && !selectedOpt1) return null;
    if (hasOpt2 && !selectedOpt2) return null;
    return variants.find((v) =>
      (!hasOpt1 || v.option1 === selectedOpt1) &&
      (!hasOpt2 || v.option2 === selectedOpt2)
    ) ?? null;
  }, [selectedOpt1, selectedOpt2, variants, hasOpt1, hasOpt2]);

  // Is an option1 value entirely out of stock across all option2s?
  const isOpt1OOS = (val: string) =>
    variants.filter((v) => v.option1 === val).every((v) => v.inventory === 0);

  // Is an option2 value out of stock given the currently selected option1?
  const isOpt2OOS = (val: string) => {
    const related = variants.filter(
      (v) => v.option2 === val && (!selectedOpt1 || v.option1 === selectedOpt1)
    );
    return related.length === 0 || related.every((v) => v.inventory === 0);
  };

  const canAdd = (!hasOpt1 || !!selectedOpt1) && (!hasOpt2 || !!selectedOpt2);

  const handleAdd = () => {
    const toAdd = selectedVariant ?? variants[0];
    if (!toAdd) return;
    onConfirm(toAdd);
    onClose();
  };

  // ── Button label ─────────────────────────────────────────────────────────
  const btnLabel = (() => {
    if (hasOpt1 && !selectedOpt1) return `SELECT ${label1}`;
    if (hasOpt2 && !selectedOpt2) return `SELECT ${label2}`;
    return "ADD TO BAG";
  })();

  // ── Colours ──────────────────────────────────────────────────────────────
  const bg         = isDark ? "#1C1C1E" : "#FFFFFF";
  const handleCol  = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)";
  const textPri    = isDark ? "#FFFFFF" : "#000000";
  const textMuted  = isDark ? "rgba(255,255,255,0.50)" : "rgba(0,0,0,0.44)";
  const chipBg     = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.05)";
  const chipBorder = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)";
  const imageBg    = isDark ? "#2C2C2E" : "#F2F2F7";
  const divider    = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";

  // ── Chip renderer ─────────────────────────────────────────────────────────
  const renderChips = (
    values: string[],
    selected: string | null,
    onSelect: (v: string) => void,
    isOOS: (v: string) => boolean,
    label: string,
  ) => (
    <View style={styles.axisWrap}>
      <Text style={[styles.axisLabel, { color: textMuted }]}>
        {selected ? `${label} — ${selected}` : `SELECT ${label}`}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {values.map((val) => {
          const active = selected === val;
          const oos    = isOOS(val);
          return (
            <Pressable
              key={val}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? PRIMARY : chipBg,
                  borderColor: active ? PRIMARY : chipBorder,
                  opacity: oos ? 0.35 : pressed ? 0.75 : 1,
                },
              ]}
              onPress={() => !oos && onSelect(val)}
              disabled={oos}
            >
              <Text style={[styles.chipText, { color: active ? "#FFF" : textPri }]}>
                {val}
              </Text>
              {oos && <View style={styles.strikeThrough} />}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

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
        style={[styles.sheet, { backgroundColor: bg, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: handleCol }]} />

        {/* ── Product mini-header ──────────────────────────────────────── */}
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

        {/* ── Option axes ──────────────────────────────────────────────── */}
        {(hasOpt1 || hasOpt2) && (
          <View style={[styles.optionsWrap, { borderTopColor: divider }]}>
            {hasOpt1 && renderChips(
              opt1Values,
              selectedOpt1,
              (v) => { setSelectedOpt1(v); setSelectedOpt2(null); },
              isOpt1OOS,
              label1,
            )}
            {hasOpt2 && renderChips(
              opt2Values,
              selectedOpt2,
              setSelectedOpt2,
              isOpt2OOS,
              label2,
            )}
          </View>
        )}

        {/* ── Add button ───────────────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: canAdd
                ? PRIMARY
                : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={handleAdd}
          disabled={!canAdd}
        >
          <Text style={[styles.addBtnText, { color: canAdd ? "#FFF" : textMuted }]}>
            {btnLabel}
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
    marginBottom: 20,
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
  optionsWrap: {
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 18,
    marginBottom: 20,
  },
  axisWrap: {
    gap: 10,
  },
  axisLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 2,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 52,
    position: "relative",
    overflow: "hidden",
  },
  chipText: {
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
  },
  addBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
