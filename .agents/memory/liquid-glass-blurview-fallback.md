---
name: Liquid Glass BlurView fallback
description: Pattern for icon buttons / search bars on iOS < 26 using BlurView instead of LiquidGlassBg
---

## Rule
For every element that gets `LiquidGlassBg` on iOS 26+, the non-iOS26 path on iOS must use `BlurView` with `style={StyleSheet.absoluteFill}`, and the parent `Pressable`/`View` must have `overflow: "hidden"` so the blur is clipped to the border radius.

Web gets neither — just a plain background color or transparent.

## How to apply

```tsx
<Pressable style={[styles.glassIconBtn, { backgroundColor: "transparent" }]}>
  {isIOS26Plus
    ? <LiquidGlassBg />
    : Platform.OS !== "web" && (
        <BlurView
          style={StyleSheet.absoluteFill}
          intensity={55-60}
          tint={isDark ? "systemThinMaterialDark" : "systemThinMaterial"}
        />
      )
  }
  {/* icon */}
</Pressable>
```

`glassIconBtn` style must include `overflow: "hidden"`.

For search bars that already have `overflow: "hidden"` on the parent `Animated.View`, add it inline on the inner `Pressable` style as well.

## Why
`BlurView` ignores `borderRadius` of the parent unless the parent (or BlurView itself) has `overflow: "hidden"`. Without it the blur bleeds outside the circle on iOS < 26.

The `tint` should follow `isDark` so Dark Mode gets a darker frosted glass and Light Mode gets a lighter one.
