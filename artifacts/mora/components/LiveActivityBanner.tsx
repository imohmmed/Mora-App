/**
 * LiveActivityBanner.tsx
 * In-app Dynamic Island–style banner that simulates iOS Live Activities.
 * Works in Expo Go + Development Builds.
 * Colors: black bg · Mora blue #0274C1 · white text
 *
 * Real iOS Live Activities via ActivityKit require a dev build +
 * a Swift Widget extension — this component provides the same UX
 * purely in React Native.
 */
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNotification } from "@/context/NotificationContext";

const PRIMARY = "#0274C1";
const BG = "#0A0A0A";
const SUCCESS = "#22C55E";
const WARNING = "#F59E0B";
const DANGER = "#EF4444";

const STAGE_CONFIG = {
  confirmed: {
    icon: "check-circle" as const,
    color: SUCCESS,
    text: "تم تثبيت طلبك بنجاح",
  },
  preparing: {
    icon: "package" as const,
    color: PRIMARY,
    text: "يتم تجهيز طلبك",
  },
  shipping: {
    icon: "truck" as const,
    color: PRIMARY,
    text: "طلبك في الطريق إليك",
  },
  delivered: {
    icon: "gift" as const,
    color: SUCCESS,
    text: "تم توصيل طلبك",
  },
  issue: {
    icon: "alert-triangle" as const,
    color: DANGER,
    text: "طلبك يحتاج مراجعة",
  },
};

export function LiveActivityBanner() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cartActivity, orderActivity, endOrderActivity } = useNotification();

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scaleX = useRef(new Animated.Value(0.25)).current;

  const isVisible =
    (cartActivity?.active && (cartActivity.totalItems ?? 0) > 0) ||
    orderActivity?.active;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 18,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleX, {
          toValue: 1,
          damping: 20,
          stiffness: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: -120,
          damping: 20,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scaleX, {
          toValue: 0.25,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const topPad = Platform.OS === "ios" ? insets.top : insets.top + 4;

  // ── Content ──────────────────────────────────────────────────────────────────
  let content: React.ReactNode = null;

  if (orderActivity?.active) {
    const stage = orderActivity.stage ?? "confirmed";
    const cfg = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG] ?? STAGE_CONFIG.confirmed;

    content = (
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: cfg.color + "22" }]}>
          <Feather name={cfg.icon} size={16} color={cfg.color} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.stageLine} numberOfLines={1}>
            {cfg.text}
          </Text>
          {orderActivity.orderId && (
            <Text style={styles.subLine}>طلب #{orderActivity.orderId}</Text>
          )}
        </View>
        {stage === "issue" && (
          <Pressable
            style={styles.ctaBtn}
            onPress={() => {
              router.push(`/(tabs)/account` as any);
              endOrderActivity();
            }}
          >
            <Text style={styles.ctaText}>تواصل معنا</Text>
          </Pressable>
        )}
        {stage === "delivered" && (
          <Pressable
            style={[styles.ctaBtn, { backgroundColor: SUCCESS + "22" }]}
            onPress={endOrderActivity}
          >
            <Feather name="x" size={12} color={SUCCESS} />
          </Pressable>
        )}
      </View>
    );
  } else if (cartActivity?.active) {
    const count = cartActivity.totalItems ?? 0;
    content = (
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: PRIMARY + "22" }]}>
          <Feather name="shopping-bag" size={16} color={PRIMARY} />
        </View>
        <Text style={styles.cartText}>
          {count} {count === 1 ? "منتج" : "منتجات"} في سلتك
        </Text>
        <View style={[styles.badge, { backgroundColor: PRIMARY }]}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      </View>
    );
  }

  if (!content) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: topPad + 4,
          opacity,
          transform: [{ translateY }, { scaleX }],
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        style={styles.pill}
        onPress={() => {
          if (orderActivity?.active) {
            router.push("/(tabs)/account" as any);
          } else {
            router.push("/(tabs)/cart" as any);
          }
        }}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
    elevation: 99,
  },
  pill: {
    backgroundColor: BG,
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 160,
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  stageLine: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
  },
  subLine: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    marginTop: 1,
  },
  cartText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
    textAlign: "right",
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  ctaBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.2)",
  },
  ctaText: {
    color: "#EF4444",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
