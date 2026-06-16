---
name: LiquidGlassBg pattern
description: How to apply iOS 26 Liquid Glass backgrounds using @expo/ui without crashing
---

## Rule
Use `components/LiquidGlassBg.tsx` (Host + GlassEffectContainer + VStack with glassEffect modifier)
as an `absoluteFill` layer inside any container that needs Liquid Glass on iOS 26+.

**Why:**
- `expo-glass-effect` (GlassView) crashes on iOS 26 beta (EXC_BAD_ACCESS in registerNativeViews).
- `@expo/ui` Host + GlassEffectContainer works because it uses SwiftUI hosting, not a Fabric native view.
- GlassEffectContainer docs: children must have `.glassEffect()` modifier applied.
- The pattern: `<Host ignoreSafeArea="all"><GlassContainer><VStack modifiers={[glassEffect(), frame(maxSize)]} /></GlassContainer></Host>`

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
iOS 26 (the beta) reports `Platform.Version` as `26`. Older iOS reports 17/18/etc.

**Do NOT:**
- Use `nativeReady` guard with `@expo/ui` Host — it handles its own deferred render.
- Use `expo-glass-effect` GlassView — permanently banned, crashes on iOS 26 beta.
- Mix SwiftUI (GlassContainer children) with native RN views — use the layering pattern instead.
