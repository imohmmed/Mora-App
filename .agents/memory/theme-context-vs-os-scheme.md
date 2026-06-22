---
name: Theme — app ThemeContext vs OS useColorScheme
description: Custom UI must read theme from ThemeContext.resolvedScheme, never react-native useColorScheme()
---

# Rule
Any custom component that picks colours for light/dark (tab bars, headers, glass
surfaces, etc.) MUST read the scheme from `useTheme().resolvedScheme`
(`@/context/ThemeContext`), NOT from react-native's `useColorScheme()`.

**Why:** Mora has an in-app theme override (light / dark / system) persisted in
AsyncStorage via ThemeContext. `useColorScheme()` only reports the OS setting.
When the two disagree (e.g. app forced dark while OS is light), components that
used `useColorScheme()` rendered the wrong palette — e.g. the iOS Liquid-Glass
tab bar drew near-black icons (#0A0A0A) on a dark glass background → icons
invisible after the user switched theme inside the app.

**How to apply:** grep for `useColorScheme` in artifacts/mora before shipping
theme work; replace with `const { resolvedScheme } = useTheme()`. The only
legitimate `useColorScheme()` caller is ThemeContext itself (to resolve
`mode === "system"`).

# iOS 26 active-tab indicator (@expo/ui Liquid Glass)
To give a custom @expo/ui glass tab bar an Instagram-style "you are here"
selector, apply a per-icon `glassEffect({ glass: { variant:"regular",
interactive:true, tint: PRIMARY }, shape:"capsule" })` modifier to ONLY the
focused ExpoImage (inactive icons get just the frame modifier). The tinted
glass capsule renders behind the active icon and adapts to light/dark via the
system material. Make the active icon white so it reads on the tinted capsule.
These changes live in `components/NativeGlassTabBar.ios.tsx` and only take
effect in a native build — web uses `WebLiquidTabBar.tsx` (its own animated pill).
