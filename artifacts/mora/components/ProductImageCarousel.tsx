import React, { useEffect, useRef, useState } from "react";
import { PanResponder, StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import { Image } from "expo-image";

interface Props {
  images: string[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  placeholder?: React.ReactNode;
}

export function ProductImageCarousel({ images, style, children, placeholder }: Props) {
  const [index, setIndex] = useState(0);
  const isDragging = useRef(false);
  const countRef = useRef(images.length);
  countRef.current = images.length;

  const count = images.length;
  const safeIdx = count > 0 ? index % count : 0;

  // Auto-advance every 5 seconds when not dragging
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => {
      if (!isDragging.current) {
        setIndex((p) => (p + 1) % countRef.current);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [count]);

  // Reset index if images change
  useEffect(() => {
    setIndex(0);
  }, [images.join(",")]);

  const panResponder = useRef(
    PanResponder.create({
      // Don't grab on start — let children (Pressable, buttons) get taps
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      // Claim horizontal swipe mid-gesture
      onMoveShouldSetPanResponder: (_, gs) =>
        countRef.current > 1 &&
        Math.abs(gs.dx) > 8 &&
        Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderGrant: () => {
        isDragging.current = true;
      },
      onPanResponderRelease: (_, gs) => {
        isDragging.current = false;
        const c = countRef.current;
        if (c > 1 && Math.abs(gs.dx) > 20) {
          setIndex((p) => (gs.dx < 0 ? (p + 1) % c : (p - 1 + c) % c));
        }
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
      },
    })
  ).current;

  return (
    <View style={[styles.wrap, style]} {...panResponder.panHandlers}>
      {count > 0 && images[safeIdx] ? (
        <Image
          key={images[safeIdx]}
          source={{ uri: images[safeIdx] }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={250}
        />
      ) : (
        placeholder ?? null
      )}

      {/* Overlay children (tags, wishlist buttons, etc.) */}
      {children}

      {/* Dot indicators — only when multiple images */}
      {count > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {images.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === safeIdx ? "#fff" : "rgba(255,255,255,0.45)",
                  width: i === safeIdx ? 14 : 5,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    position: "absolute",
    bottom: 7,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
});
