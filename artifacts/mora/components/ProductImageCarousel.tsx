import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from "react-native";
import { Image } from "expo-image";

interface Props {
  images: string[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  placeholder?: React.ReactNode;
}

export function ProductImageCarousel({ images, style, children, placeholder }: Props) {
  const [index, setIndex] = useState(0);
  const widthRef = useRef(0);
  const [width, setWidth] = useState(0);

  const translateX = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);
  const indexRef = useRef(0);
  const countRef = useRef(images.length);
  countRef.current = images.length;

  const count = images.length;

  const goTo = useCallback(
    (nextIdx: number, direction: "left" | "right", duration = 350) => {
      const w = widthRef.current;
      if (!w) return;
      Animated.timing(translateX, {
        toValue: direction === "left" ? -w : w,
        duration,
        useNativeDriver: true,
      }).start(() => {
        translateX.setValue(0);
        indexRef.current = nextIdx;
        setIndex(nextIdx);
      });
    },
    [translateX]
  );

  // Auto-advance every 3 seconds
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => {
      if (!isDragging.current) {
        const c = countRef.current;
        goTo((indexRef.current + 1) % c, "left");
      }
    }, 3000);
    return () => clearInterval(id);
  }, [count, goTo]);

  // Reset when image list changes
  useEffect(() => {
    translateX.setValue(0);
    indexRef.current = 0;
    setIndex(0);
  }, [images.join(","), translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,

      // Capture horizontal swipes — fires before parent ScrollView
      onMoveShouldSetPanResponder: (_, gs) =>
        countRef.current > 1 &&
        Math.abs(gs.dx) > 5 &&
        Math.abs(gs.dx) > Math.abs(gs.dy) * 1.1,
      onMoveShouldSetPanResponderCapture: (_, gs) =>
        countRef.current > 1 &&
        Math.abs(gs.dx) > 5 &&
        Math.abs(gs.dx) > Math.abs(gs.dy) * 1.1,

      onPanResponderGrant: () => {
        isDragging.current = true;
        translateX.stopAnimation();
      },

      onPanResponderMove: (_, gs) => {
        const c = countRef.current;
        // Rubber-band at the edges (first or last image)
        let dx = gs.dx;
        const atFirst = indexRef.current === 0;
        const atLast = indexRef.current === c - 1;
        if ((atFirst && dx > 0) || (atLast && dx < 0)) {
          dx = dx * 0.25; // dampen
        }
        translateX.setValue(dx);
      },

      onPanResponderRelease: (_, gs) => {
        isDragging.current = false;
        const c = countRef.current;
        const w = widthRef.current;
        if (c <= 1 || !w) {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
          return;
        }

        const threshold = w * 0.2;
        const fastSwipe = Math.abs(gs.vx) > 0.4;

        if (gs.dx < -threshold || (fastSwipe && gs.dx < -10)) {
          if (indexRef.current < c - 1) {
            goTo(indexRef.current + 1, "left", 220);
          } else {
            // snap back
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
          }
        } else if (gs.dx > threshold || (fastSwipe && gs.dx > 10)) {
          if (indexRef.current > 0) {
            goTo(indexRef.current - 1, "right", 220);
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
          }
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 100, friction: 12 }).start();
        }
      },

      onPanResponderTerminate: () => {
        isDragging.current = false;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
      },
    })
  ).current;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  }, []);

  const safeIdx = count > 0 ? index % count : 0;
  const prevIdx = count > 1 ? (safeIdx - 1 + count) % count : -1;
  const nextIdx = count > 1 ? (safeIdx + 1) % count : -1;

  return (
    <View
      style={[styles.wrap, style]}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      {width > 0 && (
        <>
          {/* Prev image */}
          {prevIdx >= 0 && images[prevIdx] && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { transform: [{ translateX: Animated.add(new Animated.Value(-width), translateX) }] },
              ]}
              pointerEvents="none"
            >
              <Image source={{ uri: images[prevIdx] }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Animated.View>
          )}

          {/* Current image */}
          <Animated.View
            style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}
            pointerEvents="none"
          >
            {count > 0 && images[safeIdx] ? (
              <Image source={{ uri: images[safeIdx] }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              placeholder ?? null
            )}
          </Animated.View>

          {/* Next image */}
          {nextIdx >= 0 && images[nextIdx] && (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { transform: [{ translateX: Animated.add(new Animated.Value(width), translateX) }] },
              ]}
              pointerEvents="none"
            >
              <Image source={{ uri: images[nextIdx] }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Animated.View>
          )}
        </>
      )}

      {/* Placeholder when no images and no width yet */}
      {count === 0 && (placeholder ?? null)}

      {/* Overlay children (tags, wishlist buttons, etc.) */}
      {children}

      {/* Dot indicators */}
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
