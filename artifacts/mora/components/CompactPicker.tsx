/**
 * CompactPicker — identical style to AppleActionSheet but with a scrollable
 * options list (maxHeight 300) so it never covers the full screen.
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";

const PRIMARY = "#0274C1";

export interface PickerOption {
  label: string;
  value: string;
}

interface Props {
  visible: boolean;
  title?: string;
  options: PickerOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onCancel: () => void;
}

export function CompactPicker({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onCancel,
}: Props) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";

  const cardBg   = isDark ? "rgba(44,44,46,0.92)"  : "rgba(242,242,247,0.92)";
  const cancelBg = isDark ? "rgba(44,44,46,0.92)"  : "rgba(242,242,247,0.92)";
  const textColor  = isDark ? "#FFFFFF" : "#000000";
  const titleColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
  const divider    = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";

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
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 400,
          duration: 200,
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

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      </Animated.View>

      <Animated.View
        style={[styles.sheetWrapper, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Options card with scrollable list */}
        <View
          style={[styles.card, { backgroundColor: cardBg }]}
          // @ts-ignore web className
          className="mora-sheet-card"
        >
          {title ? (
            <>
              <View style={styles.titleRow}>
                <Text style={[styles.titleText, { color: titleColor }]}>{title}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: divider }]} />
            </>
          ) : null}

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === selectedValue;
              const isLast = idx === options.length - 1;
              return (
                <React.Fragment key={opt.value}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.optionRow,
                      pressed && {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                      },
                    ]}
                    onPress={() => onSelect(opt.value)}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: isSelected ? PRIMARY : textColor },
                      ]}
                    >
                      {opt.label}
                    </Text>
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
          </ScrollView>
        </View>

        {/* Cancel — separate card */}
        <Pressable
          style={({ pressed }) => [
            styles.cancelCard,
            { backgroundColor: cancelBg, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={onCancel}
        >
          <Text style={[styles.cancelText, { color: PRIMARY }]}>Cancel</Text>
        </Pressable>
      </Animated.View>

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
    paddingBottom: 12,
    gap: 8,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  scroll: {
    maxHeight: 300,
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
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  optionLabel: {
    fontSize: 17,
    fontFamily: "Inter_400Regular",
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
