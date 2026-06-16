---
name: "@expo/ui SwiftUI views must be wrapped in <Host>"
description: Why @expo/ui (swift-ui) views crash RN Fabric at launch unless wrapped in a <Host>, and how to use them safely
---

## Rule
Every `@expo/ui/swift-ui` view (`GlassEffectContainer`, `Button`, `HStack`, `Image`, `TextField`, etc.) MUST be rendered inside a `<Host>` from `@expo/ui/swift-ui`. Never place a SwiftUI virtual view directly as a child of a React Native `<View>`.

**Why:** On New Architecture (Fabric), an unhosted SwiftUI view's native peer is `SwiftUIVirtualViewObjC`. When Fabric mounts its children it calls UIKit `-[UIView _addSubview:positioned:relativeTo:]`, which the SwiftUI peer cannot satisfy → `-[SwiftUIVirtualViewObjC forwardingTargetForSelector:]` → `EXC_CRASH / SIGABRT` at launch (or when the screen mounts). `<Host>` is the bridge that hosts SwiftUI content inside the RN tree correctly.

**Symptom seen in production:** TestFlight crash with stack `RCTViewComponentView mountChildComponentView:` → `_addSubview:` → `SwiftUIVirtualViewObjC forwardingTargetForSelector:`. The culprit was a custom tab bar (`NativeGlassTabBar.ios.tsx`, `FloatingTabBar.tsx`) putting `GlassEffectContainer` straight into a `<View>` with no `<Host>`. HomeHeader / CategoryTabs / LiquidGlassBg never crashed because they already wrapped their SwiftUI content in `<Host>`.

## How to apply
- Pattern: `<View>{...}<Host matchContents style={{height: H}}><GlassEffectContainer>...</GlassEffectContainer></Host>{...}</View>`. Use `matchContents` so the Host sizes to the SwiftUI content.
- Keep a non-SwiftUI fallback (e.g. `BlurView` + `Pressable`) for older iOS / when the bridge isn't ready, gated behind a `useGlass` flag.
- The `useGlass` guard must null-check EVERY @expo/ui symbol you call (Host, GlassEffectContainer, Button, AND every modifier like `buttonStyle`/`frame`) — the require can partially fail and calling an undefined modifier throws a JS crash.
- Do NOT swap @expo/ui for expo-blur to "fix" this — the user wants native SwiftUI Liquid Glass; the real fix is the `<Host>` wrapper.
- Overlays that must live in the RN layer (e.g. a cart count badge) stay as siblings of `<Host>` in the RN `<View>`, positioned absolutely — they cannot be children of the SwiftUI tree.
