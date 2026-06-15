---
name: SwiftUI first-render crash fix
description: iOS 26 crashes because expo-glass-effect / @expo/ui SwiftUI host initialises async — fix defers rendering by one cycle
---

## The Rule
Never render any SwiftUI / @expo/ui component on the first render cycle. Gate all glass/native-UI on `useNativeReady()` which returns `false` on mount and `true` after `useEffect` fires.

**Why:** On iOS 26, `expo-glass-effect`, `@expo/ui/swift-ui` (ExpoButton, ExpoUIHost, Host, HStack), and `expo-router/unstable-native-tabs` (NativeTabLayout) all crash on first render because the SwiftUI host bridge initialises asynchronously. After the first JS render cycle the bridge is ready and SwiftUI works fine.

**How to apply:**
- Import `useNativeReady` from `@/hooks/useNativeReady`
- In every component that conditionally renders SwiftUI:
  ```tsx
  const nativeReady = useNativeReady();
  const useGlass = IS_IOS && !!GlassViewComp && nativeReady;
  ```
- For export-level switches (CategoryTabs, HomeHeader): gate in the exported function, not the inner component
- For tab layout: keep `NativeTabBoundary` error boundary in `(tabs)/_layout.tsx` as a second safety net

## Files where this pattern is applied
All 7 glass-using files in the mora app:
- `app/(tabs)/index.tsx` — ProductCard (GlassView tag + ExpoButton)
- `app/(tabs)/cart.tsx` — CartScreen bottom bar GlassView
- `app/(tabs)/search.tsx` — SearchResultCard + SearchScreen
- `app/(tabs)/account.tsx` — AccountExpoUI SwiftUI form switch
- `components/HomeHeader.ios.tsx` — exported HomeHeader switch
- `components/CategoryTabs.ios.tsx` — exported CategoryTabs switch
- `components/QuickAddSheet.tsx` — GlassView bg + ExpoButton chips (2 sites)

## Checkout / Order flow (already complete — do not rebuild)
- POST /store/orders exists in api-server/src/routes/orders.ts with IQD, address save
- auth/me returns `address: { city, district, street }` — AuthUser type includes it
- mora checkout/index.tsx auto-fills name/phone/address from `user`; sends Bearer token
- mora auth screen handles `returnTo` param via useLocalSearchParams
- store checkout has 3-step StepIndicator + auth guard (LoginGate) + user auto-fill
