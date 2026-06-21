import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
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
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const indexRef = useRef(0);
  const widthRef = useRef(0);
  const isDragging = useRef(false);
  const count = images.length;

  const scrollTo = useCallback((idx: number, animated = true) => {
    const w = widthRef.current;
    if (!w || !scrollRef.current) return;
    scrollRef.current.scrollTo({ x: w * idx, animated });
    indexRef.current = idx;
    setIndex(idx);
  }, []);

  // Auto-advance every 3 seconds
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => {
      if (!isDragging.current) {
        const next = (indexRef.current + 1) % count;
        scrollTo(next, true);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [count, scrollTo]);

  // Reset when image list changes
  useEffect(() => {
    indexRef.current = 0;
    setIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [images.join(",")]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  }, []);

  const onScrollBeginDrag = useCallback(() => {
    isDragging.current = true;
  }, []);

  const onScrollEndDrag = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isDragging.current = false;
    const x = e.nativeEvent.contentOffset.x;
    const w = widthRef.current;
    if (!w) return;
    const newIdx = Math.round(x / w);
    const clamped = Math.max(0, Math.min(newIdx, count - 1));
    indexRef.current = clamped;
    setIndex(clamped);
  }, [count]);

  return (
    <View style={[styles.wrap, style]} onLayout={onLayout}>
      {width > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScrollBeginDrag={onScrollBeginDrag}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollEnd={onMomentumScrollEnd}
          style={StyleSheet.absoluteFill}
          contentContainerStyle={{ width: width * Math.max(count, 1), flexGrow: 0 }}
          bounces={false}
          decelerationRate="fast"
          disableIntervalMomentum
        >
          {count > 0
            ? images.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={{ width, height: "100%" as any }}
                  contentFit="cover"
                />
              ))
            : (
                <View style={{ width, height: "100%" as any }}>
                  {placeholder ?? null}
                </View>
              )}
        </ScrollView>
      )}

      {/* Overlay children (tags, wishlist button, etc.) */}
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
                  width: i === index ? 14 : 5,
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
