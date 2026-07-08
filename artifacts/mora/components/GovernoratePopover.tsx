import React, { useEffect, useRef, useState } from "react";
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
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

const PRIMARY = "#0274C1";

export interface GovOption {
  label: string;
  value: string;
}

interface AnchorPos {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  visible: boolean;
  anchorRef: React.RefObject<View | null>;
  options: GovOption[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  isAr?: boolean;
}

const POPOVER_WIDTH = 220;
const POPOVER_MAX_HEIGHT = 300;
const ITEM_HEIGHT = 50;

export function GovernoratePopover({
  visible,
  anchorRef,
  options,
  selectedValue,
  onSelect,
  onClose,
  isAr,
}: Props) {
  const { resolvedScheme } = useTheme();
  const isDark = resolvedScheme === "dark";
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const [anchor, setAnchor] = useState<AnchorPos | null>(null);

  useEffect(() => {
    if (visible) {
      if (anchorRef.current) {
        anchorRef.current.measure((_fx, _fy, w, h, px, py) => {
          setAnchor({ x: px, y: py, width: w, height: h });
        });
      }
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 320, friction: 22, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 130, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.88, duration: 130, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setAnchor(null), 150);
    }
  }, [visible]);

  const bg = isDark ? "rgba(36,36,40,0.96)" : "rgba(246,246,250,0.96)";
  const divColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const textColor = isDark ? "#fff" : "#000";

  const popoverHeight = Math.min(options.length * ITEM_HEIGHT, POPOVER_MAX_HEIGHT);

  let popLeft = 0;
  let popTop = 0;

  if (anchor) {
    popLeft = isAr
      ? anchor.x
      : anchor.x + anchor.width - POPOVER_WIDTH;
    popTop = anchor.y + anchor.height + 6;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      {anchor && (
        <Animated.View
          style={[
            styles.popover,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              backgroundColor: bg,
              top: popTop,
              left: popLeft,
              width: POPOVER_WIDTH,
              transformOrigin: isAr ? "top left" : "top right",
            } as any,
          ]}
          // @ts-ignore web className
          className="mora-popover"
        >
          <ScrollView
            style={{ maxHeight: POPOVER_MAX_HEIGHT }}
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
                      styles.row,
                      isAr && { flexDirection: "row-reverse" },
                      pressed && {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.09)"
                          : "rgba(0,0,0,0.05)",
                      },
                    ]}
                    onPress={() => {
                      onSelect(opt.value);
                      onClose();
                    }}
                  >
                    <Text
                      style={[
                        styles.label,
                        { color: isSelected ? PRIMARY : textColor },
                        isSelected && { fontWeight: "600" },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <Feather name="check" size={14} color={PRIMARY} />
                    )}
                  </Pressable>
                  {!isLast && (
                    <View style={[styles.divider, { backgroundColor: divColor }]} />
                  )}
                </React.Fragment>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}

      {Platform.OS === "web" && (
        // @ts-ignore
        <style>{`
          .mora-popover {
            backdrop-filter: blur(40px) saturate(180%);
            -webkit-backdrop-filter: blur(40px) saturate(180%);
          }
        `}</style>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  popover: {
    position: "absolute",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 50,
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontFamily: "Cairo_400Regular",
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
});
