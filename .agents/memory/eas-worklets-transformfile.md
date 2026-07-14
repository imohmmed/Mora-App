---
name: EAS iOS Metro transformFile crash
description: Root cause was missing esbuild binary on macOS EAS, NOT worklets version mismatch
---

## Rule
`react-native-reanimated@4.4.1` REQUIRES `react-native-worklets@0.9.x` — enforced in Ruby
podspec at CocoaPods install time (not pnpm). Downgrading worklets to 0.8.x breaks pod install.

The `Cannot read properties of undefined (reading 'transformFile')` Metro error was caused by
**missing esbuild binary on EAS macOS**, not worklets version incompatibility.

**Why:** worklets 0.9.x depends on `metro-transform-worker@0.83+` which uses esbuild to
implement `transformFile`. When esbuild binary is absent (darwin-arm64 excluded + install script
skipped), `transformFile` is undefined and Metro crashes during bundling.

**How to apply:**
- Keep `react-native-worklets: "0.9.2"` in artifacts/mora/package.json
- Do NOT add workspace override for react-native-worklets (reanimated podspec checks the version)
- In pnpm-workspace.yaml `allowBuilds`: set `esbuild: true` (NOT false)
- In pnpm-workspace.yaml `overrides`: do NOT exclude `esbuild>@esbuild/darwin-arm64` or
  `esbuild>@esbuild/darwin-x64` — EAS macOS needs these to function
- worklets 0.9.x + RN 0.81 mismatch (compatibility.json says 0.83+) is a warning only;
  it does not prevent successful builds in practice with Expo SDK 56
