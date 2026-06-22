---
name: LiquidGlassBg pattern
description: How to apply iOS 26 Liquid Glass backgrounds using @expo/ui without crashing
---

## Rule
Use `components/LiquidGlassBg.tsx` — `Host → VStack(glassEffect, frame)` — as an
`absoluteFill` layer inside any container that needs Liquid Glass on iOS 26+.

**Why GlassEffectContainer is NOT used:**
`GlassEffectContainer` is for morphing animations between multiple glass elements and
needs a global coordinator connection in the UIWindow hierarchy. This connection fails
inside pushed UINavigationController Stack screens (product/collection pages), so glass
renders on Tab screens but NOT on Stack screens. Removing it and applying `glassEffect()`
directly on VStack works in every context (Tab, Stack, Modal).

**Correct pattern:**
```tsx
<Host ignoreSafeArea="all" style={StyleSheet.absoluteFill} pointerEvents="none">
  <VStack modifiers={[glassEffect(), frame({ maxWidth: "infinity", maxHeight: "infinity" })]} />
</Host>
```

**How to apply:**
```tsx
import { LiquidGlassBg, isIOS26Plus } from "@/components/LiquidGlassBg";

// As a background layer:
<View style={s.bar}>
  <LiquidGlassBg />         // absoluteFill, pointerEvents="none"
  <Text>Content on top</Text>
</View>

// Make parent transparent on iOS 26+:
backgroundColor: isIOS26Plus ? "transparent" : solidColor

// For tab bar background:
tabBarBackground: () => isIOS26Plus ? <LiquidGlassBg /> : <BlurView .../>
```

**@expo/ui glass chips (QuickAddSheet pattern):**
```tsx
// Size/color chips — works on all iOS with @expo/ui:
<Host matchContents style={{ height: 44 }}>
  <Button label={val} modifiers={[glassEffect({ glass: { tint: PRIMARY } }), padding(...)]} />
</Host>
```

**Detection:**
```tsx
export const isIOS26Plus = Platform.OS === "ios" && Number(Platform.Version) >= 26;
```

**Do NOT:**
- Wrap in `GlassEffectContainer` for static backgrounds — breaks on Stack screens.
- Use `expo-glass-effect` GlassView — crashes on iOS 26 beta (EXC_BAD_ACCESS).
- Mix SwiftUI children with native RN views — use the layering pattern instead.
