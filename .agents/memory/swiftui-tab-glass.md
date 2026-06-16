---
name: SwiftUI Tab Bar — @expo/ui Glass
description: How to get Liquid Glass tab bar without NativeTabs crash; GlassEffectContainer approach
---

## The Rule
Never use `expo-router/unstable-native-tabs` (NativeTabs). Use `@expo/ui/swift-ui`'s `GlassEffectContainer` + `Button(buttonStyle:'glass')` as a custom `tabBar` render function in expo-router's `Tabs`.

**Why:** NativeTabs sets up a SwiftUI UIHostingController navigation hierarchy on first render, before the native bridge is fully initialized. This causes a native-layer crash that bypasses ALL JS error boundaries (including `NativeTabBoundary`). The app shows "Something went wrong" on every cold launch; "Try Again" works because the bridge is now ready.

**How to apply:**
- `NativeGlassTabBar.ios.tsx` — platform-specific file so it's iOS-only
- Load `GlassEffectContainer`, `Button`, `buttonStyle`, `frame` from `@expo/ui/swift-ui` via try/catch at module level
- Gate with `useNativeReady()` (defers until after first render) + re-check `isLiquidGlassAvailable()` inside component (NOT at module level — returns false before bridge init)
- BlurView fallback when `nativeReady = false` or glass not available (older iOS)
- Cart badge overlaid as a separate RN `View` since `@expo/ui` Button can't host RN children for badges
- `Tabs as any` cast needed in `_layout.tsx` because expo-router TS types don't expose `tabBar` prop
- `color as string` cast needed in `tabBarIcon` callbacks (`color` is `ColorValue` in some expo-router versions)
- `NativeGlassTabBar.tsx` (non-iOS) exports a no-op so the import doesn't break other platforms

## Key API
```ts
import { GlassEffectContainer, Button } from "@expo/ui/swift-ui";
import { buttonStyle, frame } from "@expo/ui/swift-ui/modifiers";

<GlassEffectContainer spacing={2}>
  <Button systemImage="house.fill" onPress={...}
    modifiers={[buttonStyle("glass"), frame({ width: 58, height: 52 })]} />
  // ... more tabs
</GlassEffectContainer>
```
`buttonStyle('glass')` and `buttonStyle('glassProminent')` require iOS 26+.
Items inside `GlassEffectContainer` with `spacing` blend into one liquid glass bar.
