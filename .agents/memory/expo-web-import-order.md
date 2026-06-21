---
name: Expo Web Import Order TDZ
description: Mixing import statements with executable code in _layout.tsx causes a Temporal Dead Zone crash on Expo web builds.
---

## Rule
All `import` declarations in `_layout.tsx` (and any Expo Router layout file) must appear **before** any executable code. Never place `import` statements after `if` blocks, `try/catch`, or any other runtime statements.

## Why
Metro bundler for Expo web uses a module system where static `import` declarations are hoisted. When imports are interleaved with executable code, the bundler can generate incorrect initialization order in the output bundle. This results in a variable (with a minified name like `Ee`) being accessed in its Temporal Dead Zone — before its `let`/`const` binding is initialized — producing the runtime error: **"Cannot access 'X' before initialization"** on page load.

## Symptom
- The Mora web app (moramoda.tech) crashes immediately on load with `Cannot access 'Ee' before initialization` in the console.
- The error points to the main entry JS bundle.
- The error hash in the entry filename does NOT change between builds (indicating the circular init is reproducible from the same source).

## How to apply
In `artifacts/mora/app/_layout.tsx`:
1. Place ALL `import` statements at the very top of the file.
2. Move `SplashScreen.preventAutoHideAsync()`, `ErrorUtils` setup, and any other side-effect code to AFTER the last import.
3. Merge duplicate imports from the same module (e.g., `useAuth` and `AuthProvider` both from `@/context/AuthContext`) into a single `import` line.

## Also fixed
- Duplicate import of `@/context/AuthContext` (once for `useAuth` at top, once for `AuthProvider` lower down) — merged into `import { useAuth, AuthProvider } from "@/context/AuthContext"`.

## Second root cause found (same symptom, different file)
`app/(tabs)/index.tsx` home screen had `const displayBanners = banners ?? []` declared at line 411, but used in a `useEffect` deps array `[displayBanners]` at line 328 — **before** the declaration. On native, Metro transforms `const` → `var` (hoisted, no TDZ). On web, the browser's JS engine enforces true TDZ and throws "Cannot access 'Ee' before initialization" (`Ee` = minified `displayBanners`). Fix: moved the `banners` useQuery and `displayBanners` declaration to before the banner auto-scroll useEffect. The circular dep / madge scan found nothing because this is NOT a module-level cycle — it's an intra-function declaration ordering issue that only manifests with web TDZ enforcement.
