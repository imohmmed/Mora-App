---
name: Lottie on Expo (native + web)
description: How to use Lottie animations in the Mora Expo app so they work on both native and the moramoda.tech web build.
---

# Lottie in the Mora Expo app

- Use `lottie-react-native` (Expo SDK 56 → ~7.3.x via `expo install`). Import `LottieView` and use `source={require("@/assets/lottie/<name>.json")}`.
- **Web requires an extra dep:** `lottie-react-native` v7's `index.web.js` imports `@lottiefiles/dotlottie-react` (an *optional* peer). Without it the web bundle fails / animation never renders. Install it (`pnpm --filter @workspace/mora add @lottiefiles/dotlottie-react`). moramoda.tech is a real web target, so this is mandatory, not optional.
- Pass `webStyle={{ width, height }}` alongside `style` — native uses `style`, web uses `webStyle`.
- dotLottie `.lottie` files are zip archives; unzip and use the inner `animations/<id>.json` (the raw Lottie JSON) with `require()` — don't ship the `.lottie` zip.
- Harmless on web: lottie-web logs `<fePointLight> attribute x/y: Trailing garbage "50%"` SVG warnings for some effects. Not a crash. Add `onAnimationFailure` to clear any one-shot overlay state as a safety net.

**Why:** the web adapter dependency is silent — typecheck passes without `@lottiefiles/dotlottie-react`, but the web build breaks at runtime. Easy to miss.
