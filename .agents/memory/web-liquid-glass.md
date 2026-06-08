---
name: Web Liquid Glass Tab Bar
description: How Liquid Glass tab bar is implemented for Expo web vs native iOS/Android
---

## Architecture
- **iOS/Android**: `NativeTabLayout` uses `expo-router/unstable-native-tabs` + `expo-glass-effect` (custom dev build). Falls back to `ClassicTabLayout` with BlurView in Expo Go.
- **Web**: `ClassicTabLayout` passes `tabBar={(props) => <WebLiquidTabBar {...props} />}` to `<Tabs>` only when `Platform.OS === 'web'`. Default tab bar is hidden via `tabBarStyle: { display: 'none' }`.

## CSS Liquid Glass Technique (web)
- Inject `<style>` tag via `useEffect` + `document.createElement('style')` for CSS properties that can't be set in RN StyleSheet (pseudo-elements, backdrop-filter, transitions, box-shadow).
- Add `className="mora-lg-bar"` / `className="mora-lg-pill"` to View components with `// @ts-ignore` — React Native Web passes className to the DOM element.
- `backdrop-filter: blur(28px) saturate(220%) brightness(...)` on the bar container.
- Glass sheen: `::before` pseudo-element with a `linear-gradient` of rgba whites.
- Active pill: Animated.Value spring-interpolated `left` position for smooth sliding.
- Box shadows defined in CSS (not RN shadow* props which are deprecated on web).

**Why:** RN StyleSheet doesn't support pseudo-elements or backdrop-filter directly. The className injection pattern is the cleanest way to apply these web-only CSS properties.

## Scene container padding
`sceneContainerStyle={{ paddingBottom: isWeb ? 84 : 0 }}` prevents content from going under the floating tab bar on web.

## Production deployment
- Build: `cd artifacts/mora && npx expo export --platform web` → `dist/`
- Deploy: tar + scp to `/var/www/mora/artifacts/mora/dist/` on server (159.65.55.65)
- nginx serves moramoda.tech from that dist folder
