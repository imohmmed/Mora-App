/**
 * AppleActionSheet — iOS-style action sheet with Liquid Glass backdrop.
 *
 * Structure (identical to native iOS):
 *   ┌─────────────────────────────┐
 *   │  Title (optional)           │
 *   │─────────────────────────────│
 *   │  Option 1          ✓       │  ← selected item gets checkmark + blue
 *   │─────────────────────────────│
 *   │  Option 2                   │
 *   └─────────────────────────────┘
 *
 *   ┌─────────────────────────────┐
 *   │  Cancel                     │  ← separate heavy card
 *   └─────────────────────────────┘
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";

const PRIMARY = "#0274C1";

export interface ActionSheetOption {
  label: string;
  sublabel?: string;
  value: string;
  flag?: string;
}

interface Props {
  visible: boolean;
  title?: string;
  options: ActionSheetOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onCancel: () => void;
}

export function AppleActionSheet({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onCancel,
}: Props) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const isDark = useColorScheme() === "dark";

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 280,
          friction: 26,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const cardBg     = isDark ? "rgba(30,30,34,0.92)"  : "rgba(255,255,255,0.95)";
  const divider    = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
  const titleColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)";
  const textColor  = isDark ? "#FFFFFF"               : "#000000";
  const cancelBg   = isDark ? "rgba(30,30,34,0.92)"  : "rgba(255,255,255,0.95)";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <Animated.View
        style={[styles.backdrop, { opacity: fadeAnim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      </Animated.View>

      {/* ── Sheet ─────────────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.sheetWrapper,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Options card */}
        <View
          style={[styles.card, { backgroundColor: cardBg }]}
          // @ts-ignore web className
          className="mora-sheet-card"
        >
          {/* Title row */}
          {title ? (
            <>
              <View style={styles.titleRow}>
                <Text style={[styles.titleText, { color: titleColor }]}>{title}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: divider }]} />
            </>
          ) : null}

          {/* Option rows */}
          {options.map((opt, idx) => {
            const isSelected = opt.value === selectedValue;
            const isLast = idx === options.length - 1;
            return (
              <React.Fragment key={opt.value}>
                <Pressable
                  style={({ pressed }) => [
                    styles.optionRow,
                    pressed && { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" },
                  ]}
                  onPress={() => onSelect(opt.value)}
                  accessibilityRole="menuitem"
                >
                  <View style={styles.optionLeft}>
                    {opt.flag ? (
                      <Text style={styles.flag}>{opt.flag}</Text>
                    ) : null}
                    <View>
                      <Text
                        style={[
                          styles.optionLabel,
                          { color: isSelected ? PRIMARY : textColor },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {opt.sublabel ? (
                        <Text style={[styles.optionSub, { color: titleColor }]}>
                          {opt.sublabel}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {isSelected && (
                    <Text style={[styles.checkmark, { color: PRIMARY }]}>✓</Text>
                  )}
                </Pressable>
                {!isLast && (
                  <View style={[styles.divider, { backgroundColor: divider }]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Cancel button — separate card */}
        <Pressable
          style={({ pressed }) => [
            styles.cancelCard,
            { backgroundColor: cancelBg, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={[styles.cancelText, { color: PRIMARY }]}>Cancel</Text>
        </Pressable>
      </Animated.View>

      {/* Inject CSS for backdrop-filter on web */}
      {Platform.OS === "web" && (
        // @ts-ignore
        <style>{`
          .mora-sheet-card {
            backdrop-filter: blur(48px) saturate(200%);
            -webkit-backdrop-filter: blur(48px) saturate(200%);
          }
        `}</style>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.40)",
  },
  sheetWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 32,
    gap: 8,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  titleRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  titleText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 0,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  flag: {
    fontSize: 24,
  },
  optionLabel: {
    fontSize: 17,
    fontFamily: "Inter_400Regular",
  },
  optionSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 12,
  },
  cancelCard: {
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  cancelText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
});
