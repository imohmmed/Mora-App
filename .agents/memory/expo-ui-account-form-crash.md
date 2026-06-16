---
name: @expo/ui SwiftUI Form crashes on release builds
description: Why the native SwiftUI account Form was removed; which @expo/ui surfaces are release-unsafe
---

## The Rule
Do NOT render a complex `@expo/ui/swift-ui` `Form` (Section + Picker + Slider + Stepper + Toggle nested together) in a production/TestFlight build. It crashes at mount with `EXC_BAD_ACCESS (SIGSEGV)` in `-[RCTComponentViewFactory createComponentViewWithComponentHandle:]` (RCTComponentViewFactory.mm) — a pure Fabric mount crash with NO JS frames. The account screen's native SwiftUI Form was removed; logged-in iOS users now use the same React Native account UI as Android/web.

**Why:** The crash only surfaced once Apple/Firebase login started working — a signed-in user reached `/(tabs)/account` for the first time, the SwiftUI Form mounted, and the app segfaulted immediately. Simpler @expo/ui surfaces (single `Image`/`Button`/`HStack` with `glassEffect`, as in HomeHeader / tab bar / QuickAddSheet) are fine; the heavy nested Form is the unsafe one. `glassAvailable` guards (require succeeds) do NOT prevent this — the components exist, they crash at native mount.

**How to apply:**
- Prefer a React Native settings/account UI over a native SwiftUI Form. Keep native glass to small, proven pieces.
- A pure-native Fabric mount crash with no JS frames = an @expo/ui SwiftUI view failing to instantiate. Bisect by removing the most complex native view on the just-mounted screen, not by reading JS logs (there are none).
- When debugging "crashes right after login", look at what is gated behind auth — the first-seen-when-logged-in screen, not the login flow itself.
