---
name: Web Liquid Glass Tab Bar + Server Setup
description: How Liquid Glass tab bar is implemented for Expo web vs native iOS/Android, plus server PM2 processes
---

## Architecture
- **iOS/Android**: `NativeTabLayout` uses `expo-router/unstable-native-tabs` + `expo-glass-effect` (custom dev build). Falls back to `ClassicTabLayout` with BlurView in Expo Go.
- **Web**: `ClassicTabLayout` passes `tabBar={(props) => <WebLiquidTabBar {...props} />}` to `<Tabs>` only when `Platform.OS === 'web'`. Default tab bar hidden via `tabBarStyle: { display: 'none' }`.

## CSS Liquid Glass Technique (web)
- Inject `<style>` tag via `useEffect` + `document.createElement('style')` for CSS not settable in RN StyleSheet (pseudo-elements, backdrop-filter, transitions, box-shadow).
- Add `className="mora-lg-bar"` / `className="mora-lg-pill"` to View with `// @ts-ignore`.
- `backdrop-filter: blur(28px) saturate(220%) brightness(...)` on bar container.
- Glass sheen: `::before` with diagonal rgba-white gradient. Box shadows in CSS only (not RN shadow* props, deprecated on web).
- Active pill: `Animated.spring` interpolated `left` for smooth slide.
- `sceneContainerStyle={{ paddingBottom: isWeb ? 84 : 0 }}` prevents content hiding under bar.

## SQLite boolean gotcha
- SQLite returns 0/1 for booleans. React Native Fabric (iOS) crashes if a prop typed `boolean` receives a number (double). Always use `!!value` to coerce.
- BannerSlide: `disabled={!!banner.hasButton}` (not `disabled={banner.hasButton}`).

## Server PM2 processes
- `mora-api` (id 0) — API server on port 3001, cluster mode
- `mora-expo-dev` (id 3) — Expo dev server on port 8081, started via bash wrapper `/var/www/mora/start-expo-dev.sh`

## Expo dev server on production
- Runs via bash wrapper (NOT `node_modules/.bin/expo` directly — PM2 tries to run it as Node.js script which fails)
- Env: `REACT_NATIVE_PACKAGER_HOSTNAME=expo.moramoda.tech`, `CI=1`, `EXPO_NO_TELEMETRY=1`
- nginx proxies `expo.moramoda.tech:80,443` → `localhost:8081`
- SSL cert: `/etc/letsencrypt/live/expo.moramoda.tech/`

## Cloudflare + exp:// URL note
- If expo.moramoda.tech DNS is Proxied (orange cloud): Cloudflare only proxies ports 80/443, NOT 8081. Bundle URL `http://expo.moramoda.tech:8081/...` fails.
- Fix: Set expo.moramoda.tech to DNS-only (grey cloud) → server IP exposed → port 8081 accessible directly
- With DNS-only: `exp://expo.moramoda.tech` works (nginx port 80 → 8081 for manifest, port 8081 direct for bundles)

## Production deployment
- Build: `cd artifacts/mora && npx expo export --platform web` → `dist/`
- Deploy: `tar czf /tmp/mora-dist.tar.gz dist/ && scp ... && tar xzf` on server (159.65.55.65)
- nginx serves moramoda.tech from `/var/www/mora/artifacts/mora/dist/`
- API routes: `/api/store/products`, `/api/store/banners`, `/api/store/collections` etc. (note: `/api/store/` prefix, NOT `/api/products`)
