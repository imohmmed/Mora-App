/**
 * CompactPicker — small native-style bottom-sheet picker.
 * Shows a compact scrollable list (max ~300 px) that slides up from the
 * bottom, similar to iOS/Android native <select>.
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
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

  const card   = isDark ? "#2C2C2E" : "#FFFFFF";
  const fg     = isDark ? "#FFFFFF" : "#000000";
  const muted  = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)";
  const divClr = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 300,
          friction: 28,
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
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      </Animated.View>

      <Animated.View
        style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Main card */}
        <View style={[s.card, { backgroundColor: card }]}>
          {title && (
            <View style={[s.titleRow, { borderBottomColor: divClr }]}>
              <Text style={[s.title, { color: muted }]}>{title}</Text>
            </View>
          )}

          <ScrollView
            style={s.list}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === selectedValue;
              const isLast = idx === options.length - 1;
              return (
                <React.Fragment key={opt.value}>
                  <Pressable
                    onPress={() => onSelect(opt.value)}
                    style={({ pressed }) => [
                      s.row,
                      pressed && { opacity: 0.55 },
                    ]}
                  >
                    <Text
                      style={[
                        s.rowLabel,
                        { color: isSelected ? PRIMARY : fg },
                        isSelected && s.rowLabelBold,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <Feather name="check" size={16} color={PRIMARY} />
                    )}
                  </Pressable>
                  {!isLast && (
                    <View style={[s.divider, { backgroundColor: divClr }]} />
                  )}
                </React.Fragment>
              );
            })}
          </ScrollView>
        </View>

        {/* Cancel pill */}
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [
            s.cancelBtn,
            { backgroundColor: card },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[s.cancelTxt, { color: PRIMARY }]}>Cancel</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.40)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingBottom: 34,
    gap: 8,
  },
  card: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  titleRow: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  title: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  list: {
    maxHeight: 300,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: 17,
    fontFamily: "Inter_400Regular",
  },
  rowLabelBold: {
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 20,
  },
  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelTxt: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
});
