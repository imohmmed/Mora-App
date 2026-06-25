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
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  images: string[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  placeholder?: React.ReactNode;
}

export function ProductImageCarousel({ images, style, children, placeholder }: Props) {
  const { lang } = useLanguage();
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);

  const indexRef  = useRef(0);
  const widthRef  = useRef(0);
  const countRef  = useRef(images.length);
  const imagesRef = useRef(images);
  // Sync synchronously on every render so callbacks always read the live value
  const isArRef   = useRef(lang === "ar");
  isArRef.current = lang === "ar";

  // Keep refs in sync with props/state
  useEffect(() => {
    countRef.current  = images.length;
    imagesRef.current = images;
  }, [images]);

  // ── Animated values created ONCE ──────────────────────────────────────────
  const dragX   = useRef(new Animated.Value(0)).current;
  const negW    = useRef(new Animated.Value(0)).current;
  const posW    = useRef(new Animated.Value(0)).current;

  // Composed positions — created ONCE
  const prevPos = useRef(Animated.add(negW, dragX)).current;
  const nextPos = useRef(Animated.add(posW, dragX)).current;

  // For Arabic, prev panel is on RIGHT (+w) and next panel is on LEFT (-w)
  // Re-apply when language changes
  useEffect(() => {
    const w = widthRef.current;
    if (w > 0) {
      negW.setValue(isArRef.current ? w : -w);
      posW.setValue(isArRef.current ? -w : w);
    }
  }, [lang, negW, posW]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    const isAr = isArRef.current;
    negW.setValue(isAr ? w : -w);
    posW.setValue(isAr ? -w : w);
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

  // goNext/goPrev direction depends on RTL setting:
  // LTR: next is on the RIGHT → animate dragX to -width
  // RTL: next is on the LEFT  → animate dragX to +width
  const goNext = useCallback(() => {
    const n    = countRef.current;
    const next = (indexRef.current + 1) % n;
    animateTo(isArRef.current ? widthRef.current : -widthRef.current, next);
  }, [animateTo]);

  const goPrev = useCallback(() => {
    const n    = countRef.current;
    const prev = (indexRef.current - 1 + n) % n;
    animateTo(isArRef.current ? -widthRef.current : widthRef.current, prev);
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
      onMoveShouldSetPanResponder: (_, s) =>
        Math.abs(s.dx) > 6 && Math.abs(s.dx) > Math.abs(s.dy) * 1.3,
      onMoveShouldSetPanResponderCapture: (_, s) =>
        Math.abs(s.dx) > 10 && Math.abs(s.dx) > Math.abs(s.dy) * 1.5,

      onPanResponderGrant: () => {
        isPanning.current = true;
      },

      onPanResponderMove: (_, s) => {
        const n    = countRef.current;
        const i    = indexRef.current;
        const isAr = isArRef.current;
        let dx = s.dx;
        // Rubber-band at edges:
        // LTR: resist when at first (dx>0=swipe-right=go-back past start) or last (dx<0=swipe-left=past end)
        // RTL: resist when at first (dx<0=swipe-left=go-back past start) or last (dx>0=swipe-right=past end)
        if (isAr) {
          if ((i === 0 && dx < 0) || (i === n - 1 && dx > 0)) dx = dx * 0.25;
        } else {
          if ((i === 0 && dx > 0) || (i === n - 1 && dx < 0)) dx = dx * 0.25;
        }
        dragX.setValue(dx);
      },

      onPanResponderRelease: (_, s) => {
        isPanning.current = false;
        const w    = widthRef.current;
        const n    = countRef.current;
        const i    = indexRef.current;
        const isAr = isArRef.current;

        // LTR: swipe left (dx < -40) = next;  swipe right (dx > 40) = prev
        // RTL: swipe right (dx > 40) = next;  swipe left (dx < -40) = prev
        if (isAr) {
          if (s.dx > 40 && i < n - 1) {
            animateTo(w, (i + 1) % n);
          } else if (s.dx < -40 && i > 0) {
            animateTo(-w, (i - 1 + n) % n);
          } else {
            Animated.spring(dragX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
          }
        } else {
          if (s.dx < -40 && i < n - 1) {
            animateTo(-w, (i + 1) % n);
          } else if (s.dx > 40 && i > 0) {
            animateTo(w, (i - 1 + n) % n);
          } else {
            Animated.spring(dragX, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
          }
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
  // In RTL, "prev" is to the right (+width) and "next" is to the left (-width)
  // These swap which index gets placed in the prevPos vs nextPos slot
  const prevIdx = safe(index - 1);
  const nextIdx = safe(index + 1);

  return (
    <View style={[styles.wrap, style]} onLayout={onLayout}>
      {width > 0 && count > 0 && (
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
          {/* Prev panel — sits at negW+dragX (LTR: left side; RTL: right side) */}
          {count > 1 && (
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: prevPos }] }]}>
              <Image source={{ uri: images[prevIdx] }} style={styles.img} resizeMode="cover" />
            </Animated.View>
          )}
          {/* Current panel */}
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: dragX }] }]}>
            <Image source={{ uri: images[index] }} style={styles.img} resizeMode="cover" />
          </Animated.View>
          {/* Next panel — sits at posW+dragX (LTR: right side; RTL: left side) */}
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
