---
name: react-native-keyboard-controller crash
description: KeyboardProvider from react-native-keyboard-controller crashes on iOS production with "undefined is not a function" in a useEffect
---

## Rule
Do not use `KeyboardProvider` from `react-native-keyboard-controller` in `_layout.tsx`.
Also remove it from `app.json` plugins (incompatible with Node 24 during expo start).

**Why:**
On iOS production builds, `KeyboardProvider` calls an undefined function inside
its internal `useEffect` during mount. This causes:
- `TypeError: undefined is not a function`
- Stack: `commitHookEffectListMount` → anonymous function
- Caught by expo-router's error boundary → "Something went wrong" white screen

The package's `app.json` plugin also crashes Node 24 with:
`SyntaxError: Unexpected token 'typeof'` during `expo start`.

**How to apply:**
- `KeyboardProvider` wrapper removed from `app/_layout.tsx`
- `react-native-keyboard-controller` removed from `app.json` plugins list
- Runtime imports (`KeyboardAwareScrollViewCompat`) replaced with plain `ScrollView`
- The package remains in `package.json` but is not used
