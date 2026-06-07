---
name: Expo UI SwiftUI on web/Android
description: Why @expo/ui/swift-ui must be isolated in .ios.tsx files, not just Platform-gated
---

# @expo/ui SwiftUI components break non-iOS bundles

`@expo/ui/swift-ui` components (Form, Section, Switch, Slider, Picker, Host, glassEffect, etc.) render **only on native iOS**. They wrap SwiftUI views via `requireNativeViewManager`, which is unavailable on web and Android.

**Rule:** Gating *rendering* with `Platform.OS === 'ios'` is NOT enough. A static `import ... from '@expo/ui/swift-ui'` is evaluated at module-load time on every platform, and on web it throws `UnavailabilityError: expo-modules-core.requireNativeViewManager is not available on web`. The crash happens on import, before any render gate runs.

**Why:** Metro bundles the imported module regardless of runtime Platform checks; the native view manager registration executes during module evaluation.

**How to apply:** Put any module that imports `@expo/ui/swift-ui` in a platform-specific file (`Foo.ios.tsx`) and provide a non-native sibling (`Foo.tsx`) that does NOT import `@expo/ui` (return null or a plain RN fallback). Metro resolves `.ios.tsx` only on iOS and the plain `.tsx` everywhere else. The consuming screen can still branch on `Platform.OS` to pick the native vs classic RN implementation. Verify the web preview after adding Expo UI — a clean Metro bundle does not catch this; it crashes at runtime on import.

## NativeTabs (iOS 26) tabs vanish on scroll
`NativeTabs` from `expo-router/unstable-native-tabs` defaults to `minimizeBehavior="automatic"`, which collapses the Liquid Glass tab bar on scroll — making tabs (e.g. Account) appear to "disappear". Set `minimizeBehavior="never"` to keep all tabs always visible.
