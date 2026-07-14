---
name: EAS iOS Metro transformFile crash
description: global esbuild override in pnpm-workspace.yaml forced wrong esbuild version into metro-transform-worker@0.83, breaking transformFile
---

## Rule
NEVER add `esbuild: ">=X.X.X"` as a global pnpm override when react-native-worklets@0.9.x is in the project.

## Why
`react-native-reanimated@4.4.1` requires `react-native-worklets@0.9.x` (enforced in the Ruby
podspec at pod install time — cannot be bypassed). worklets@0.9.x pulls in `metro-transform-worker@0.83.7`
as a dependency. This metro version uses esbuild ~0.25.x internally.

A global `esbuild: ">=0.28.1"` override forces metro-transform-worker@0.83.7 onto esbuild 0.28.x
whose API changed enough to break the transform worker's load. Metro then gets `undefined` where it
expects a transformer object, and calling `.transformFile()` on it throws:
  `Cannot read properties of undefined (reading 'transformFile')`

## How to apply
- Keep `"drizzle-kit>@esbuild-kit/esm-loader": "npm:tsx@^4.21.0"` (scoped, safe)
- Do NOT add `esbuild: ">=X"` as a global override (it propagates into metro internals)
- For other esbuild CVEs: scope the override to the specific package e.g. `"mypkg>esbuild": ">=0.28.1"`

## Also required for EAS iOS builds to work
- `allowBuilds: esbuild: true` (NOT false) — lets EAS macOS run esbuild's install script
- Remove `"esbuild>@esbuild/darwin-arm64": "-"` and `"esbuild>@esbuild/darwin-x64": "-"` from
  overrides — EAS builds on macOS arm64 need these binaries to function
- `react-native-worklets: "0.9.2"` in mora/package.json — reanimated 4.4.1 podspec requires 0.9.x;
  downgrading to 0.8.x breaks pod install with "Failed to validate worklets version"
