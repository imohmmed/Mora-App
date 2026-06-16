---
name: SwiftUI Tab Bar — @expo/ui Glass
description: How to get a horizontal Liquid Glass tab bar without NativeTabs crash and without vertical/empty buttons
---

## The Rule
Never use `expo-router/unstable-native-tabs` (NativeTabs). Build a custom `tabBar` for expo-router `Tabs` using `@expo/ui/swift-ui`: `Host > HStack > Image` where each tab is an SF-Symbol `Image` carrying a `glassEffect` modifier. The glass look comes from the MODIFIER on each item, not from a container.

**Why (NativeTabs):** NativeTabs builds a SwiftUI UIHostingController nav hierarchy on first render before the native bridge is ready → native crash that bypasses ALL JS error boundaries. Cold launch shows "Something went wrong"; "Try Again" works because the bridge is now ready.

**Why (not GlassEffectContainer + Button):** The old `GlassEffectContainer + Button(buttonStyle:'glass')` approach rendered as empty white dots stacked VERTICALLY — `GlassEffectContainer` does not lay its children out horizontally, and the buttons came up empty. Use an explicit `HStack` for horizontal layout and `Image` (the SAME proven pattern as `HomeHeader.ios.tsx` / `CategoryTabs.ios.tsx` glass icon buttons).

**How to apply:**
- `NativeGlassTabBar.ios.tsx` (used by `app/(tabs)/_layout.tsx`) and `FloatingTabBar.tsx` (notifications/collection/product screens) both use this pattern.
- Load `Host`, `HStack`, `Image` from `@expo/ui/swift-ui` and `frame`, `glassEffect` from `@expo/ui/swift-ui/modifiers` via try/catch at module level.
- Gate rendering with `useNativeReady()` + `isIOS26Plus` + null-checks on all the loaded symbols (the `useGlass` flag). BlurView + Pressable fallback otherwise.
- Every @expo/ui SwiftUI view MUST be inside `<Host>` or Fabric crashes on mount.
- Cart badge is a separate absolutely-positioned RN `View` overlaid on a shrink-wrap container (Image can't host RN children). For a fixed N-tab layout, `badgeLeft = cartIdx*(ITEM_SIZE+ITEM_GAP)+ITEM_SIZE-16`. This math assumes a fixed tab order/count — derive from layout metrics if the tab set ever becomes dynamic.
- `Tabs as any` cast in `_layout.tsx` (expo-router TS types don't expose `tabBar`).

## Key API
```ts
import { Host, HStack, Image } from "@expo/ui/swift-ui";
import { frame, glassEffect } from "@expo/ui/swift-ui/modifiers";

<Host matchContents style={{ height: 52 }}>
  <HStack spacing={6}>
    {tabs.map(t => (
      <Image
        systemName={focused ? t.sfActive : t.sf}
        size={22}
        color={focused ? "#FFFFFF" : inactiveColor}
        onPress={...}
        modifiers={[
          frame({ width: 52, height: 52 }),
          glassEffect({ glass: { variant: "regular", interactive: true, tint: focused ? PRIMARY : undefined }, shape: "circle" }),
        ]}
      />
    ))}
  </HStack>
</Host>
```
Note: `GlassEffectContainer` IS re-exported from the `@expo/ui/swift-ui` index (v56), but do not rely on it for layout — it stacks vertically. `glassEffect` requires iOS 26+.
