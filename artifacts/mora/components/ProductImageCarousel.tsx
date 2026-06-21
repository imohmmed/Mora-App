import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  LayoutChangeEvent,
  PanResponder,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

interface Props {
  images: string[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  placeholder?: React.ReactNode;
}

export function ProductImageCarousel({ images, style, children, placeholder }: Props) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);

  const indexRef  = useRef(0);
  const widthRef  = useRef(0);
  const countRef  = useRef(images.length);
  const imagesRef = useRef(images);

  // Keep refs in sync with props/state
  useEffect(() => {
    countRef.current  = images.length;
    imagesRef.current = images;
  }, [images]);

  // ── Animated values created ONCE ──────────────────────────────────────────
  // Using useRef guarantees they are never re-created on re-render (= no glitch)
  const dragX   = useRef(new Animated.Value(0)).current;
  const negW    = useRef(new Animated.Value(0)).current; // -width  (prev panel offset)
  const posW    = useRef(new Animated.Value(0)).current; // +width  (next panel offset)

  // Composed positions — also created ONCE
  const prevPos = useRef(Animated.add(negW, dragX)).current;
  const nextPos = useRef(Animated.add(posW, dragX)).current;

  // Update ±width offset values when layout width changes
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    negW.setValue(-w);
    posW.setValue(w);
    setWidth(w);
  }, [negW, posW]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const animateTo = useCallback(
    (target: number, doneIdx: number) => {
      Animated.timing(dragX, {
        toValue:         target,
        duration:        280,
        useNativeDriver: true,
      }).start(() => {
        dragX.setValue(0);
        indexRef.current = doneIdx;
        setIndex(doneIdx);
      });
    },
    [dragX]
  );

  const goNext = useCallback(() => {
    const n    = countRef.current;
    const next = (indexRef.current + 1) % n;
    animateTo(-widthRef.current, next);
  }, [animateTo]);

  const goPrev = useCallback(() => {
    const n    = countRef.current;
    const prev = (indexRef.current - 1 + n) % n;
    animateTo(widthRef.current, prev);
  }, [animateTo]);

  // ── Auto-advance every 3 s ────────────────────────────────────────────────
  const isPanning = useRef(false);
  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => {
      if (!isPanning.current) goNext();
    }, 3000);
    return () => clearInterval(id);
  }, [images.length, goNext]);

  // ── Reset on image list change ────────────────────────────────────────────
  useEffect(() => {
    dragX.setValue(0);
    indexRef.current = 0;
    setIndex(0);
  }, [images.join(","), dragX]);

  // ── PanResponder ──────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      // Claim gesture only when horizontal movement is dominant
      onMoveShouldSetPanResponder: (_, s) =>
        Math.abs(s.dx) > 6 && Math.abs(s.dx) > Math.abs(s.dy) * 1.3,
      onMoveShouldSetPanResponderCapture: (_, s) =>
        Math.abs(s.dx) > 10 && Math.abs(s.dx) > Math.abs(s.dy) * 1.5,

      onPanResponderGrant: () => {
        isPanning.current = true;
      },

      onPanResponderMove: (_, s) => {
        const w = widthRef.current;
        const n = countRef.current;
        const i = indexRef.current;
        // Resist overscroll at edges (non-looping feel is fine here)
        let dx = s.dx;
        if ((i === 0 && dx > 0) || (i === n - 1 && dx < 0)) {
          dx = dx * 0.25; // rubber-band at boundaries
        }
        dragX.setValue(dx);
      },

      onPanResponderRelease: (_, s) => {
        isPanning.current = false;
        const w = widthRef.current;
        const n = countRef.current;
        const i = indexRef.current;

        if (s.dx < -40 && i < n - 1) {
          animateTo(-w, (i + 1) % n);
        } else if (s.dx > 40 && i > 0) {
          animateTo(w, (i - 1 + n) % n);
        } else {
          Animated.spring(dragX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
        }
      },

      onPanResponderTerminate: () => {
        isPanning.current = false;
        Animated.spring(dragX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  // ── Derived display indices ───────────────────────────────────────────────
  const count   = images.length;
  const safe    = (i: number) => ((i % count) + count) % count;
  const prevIdx = safe(index - 1);
  const nextIdx = safe(index + 1);

  return (
    <View style={[styles.wrap, style]} onLayout={onLayout}>
      {width > 0 && count > 0 && (
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
          {/* Prev panel */}
          {count > 1 && (
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: prevPos }] }]}>
              <Image source={{ uri: images[prevIdx] }} style={styles.img} resizeMode="cover" />
            </Animated.View>
          )}
          {/* Current panel */}
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: dragX }] }]}>
            <Image source={{ uri: images[index] }} style={styles.img} resizeMode="cover" />
          </Animated.View>
          {/* Next panel */}
          {count > 1 && (
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: nextPos }] }]}>
              <Image source={{ uri: images[nextIdx] }} style={styles.img} resizeMode="cover" />
            </Animated.View>
          )}
        </View>
      )}

      {count === 0 && <View style={StyleSheet.absoluteFill}>{placeholder}</View>}

      {/* Overlay children (wishlist btn, sale badge, etc.) */}
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
                  backgroundColor: i === index ? "#fff" : "rgba(255,255,255,0.45)",
                  width:           i === index ? 14 : 5,
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
  wrap: { overflow: "hidden", position: "relative" },
  img:  { width: "100%", height: "100%" },
  dots: {
    position:        "absolute",
    bottom:          7,
    left:            0,
    right:           0,
    flexDirection:   "row",
    justifyContent:  "center",
    alignItems:      "center",
    gap:             4,
  },
  dot: { height: 5, borderRadius: 3 },
});
