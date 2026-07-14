---
name: EAS iOS Metro transformFile crash
description: true root cause — pnpm 11 on EAS migrates lockfile v9→v10 and installs newer @expo/metro-config that calls patchTransformFileForPackedMaps(undefined)
---

## Root Cause (confirmed)
`Cannot read properties of undefined (reading 'transformFile')` comes from
`patchTransformFileForPackedMaps(bundler)` in
`@expo/metro-config/build/serializer/packedMap.js` where `bundler` is `undefined`.

**Why bundler is undefined:** pnpm 11 on EAS runs `pnpm install --no-frozen-lockfile`
against our pnpm 10 lockfile (lockfileVersion `9.0`). pnpm 11 must migrate this to its own
format (`10.0`) which triggers a FULL package re-resolution. Newer `@expo/metro-config@56.0.x`
patch releases (past `56.0.14`) call this function with a `bundler` arg that is `undefined`
due to an API mismatch with `@expo/metro@56.0.0`.

In `@expo/metro-config@56.0.14` (our working local version) `patchTransformFileForPackedMaps`
is EXPORTED but never CALLED within the package — it's dead code here. A newer patch version
wires it up incorrectly.

## Fix Applied
1. `package.json` root: `"packageManager": "pnpm@10.26.1"` — EAS respects this via corepack
   and uses pnpm 10.26.1, which keeps lockfileVersion `9.0` and preserves existing resolutions.
2. `pnpm-workspace.yaml` overrides: pin `@expo/metro-config: "56.0.14"` and `@expo/cli: "56.1.15"`
   — belt-and-suspenders if pnpm version control ever fails.

## Verified Working Versions
- `@expo/metro-config@56.0.14`
- `@expo/cli@56.1.15`
- `metro-transform-worker@0.84.4` (root)
- `metro-transform-worker@0.83.7` (from react-native-worklets@0.9.2 — does NOT conflict)

## Previously Ruled Out (not the real cause)
- Global `esbuild: ">=0.28.1"` override breaking metro-transform-worker@0.83.7
  (this WAS a real bug we also fixed, but it is NOT why transformFile errors)
- react-native-worklets version (worklets@0.9.x is required by reanimated@4.4.1 at
  Ruby/pod level — cannot change)
- Missing esbuild darwin binaries (separate issue, also fixed)

## Also Required for EAS iOS Builds
- `allowBuilds: esbuild: true` — lets EAS macOS run esbuild's install script
- `react-native-worklets: "0.9.2"` in mora/package.json — reanimated 4.4.1 podspec enforces
  0.9.x; downgrading to 0.8.x breaks pod install
