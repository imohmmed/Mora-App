---
name: App-wide font is Cairo
description: mora app (native + web) uses Cairo as the single font family for both Arabic and English; Inter was fully removed.
---
Cairo (Google Font) replaced Inter across the entire mora app per explicit user request — one font family that natively covers both Arabic and Latin glyphs, avoiding system-font fallback for Arabic text.

**Why:** Inter has no Arabic glyphs, so Arabic text was silently falling back to the OS system font while English used Inter — inconsistent look. User wanted one consistent, "organized" sans-serif for both languages, app-wide (not just checkout/account).

**How to apply:** Any new component must use `fontFamily: "Cairo_400Regular" | "Cairo_500Medium" | "Cairo_600SemiBold" | "Cairo_700Bold" | "Cairo_900Black"` (loaded via `@expo-google-fonts/cairo` in `app/_layout.tsx`). Never reintroduce `Inter_*` or the `@expo-google-fonts/inter` package into mora. The `store` and `admin` web artifacts were NOT touched (still reference Inter in their CSS) — treat them as a separate decision if the user later asks to unify branding across all products.
