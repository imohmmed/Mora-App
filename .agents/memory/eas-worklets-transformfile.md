---
name: EAS iOS Metro transformFile crash
description: react-native-worklets@0.9.x incompatible with RN 0.81; caused Metro bundling crash
---

## Rule
Pin `react-native-worklets` to `~0.8.0` when using RN 0.81.

`react-native-worklets@0.9.x` targets RN 0.83+ and calls `metro-transform-worker.transformFile`,
an API that only exists in Metro 0.82+ (shipped with RN 0.83+). On RN 0.81 / Metro 0.80.x,
`transformFile` is undefined → `Cannot read properties of undefined (reading 'transformFile')`
during "Bundle React Native code and images" EAS step.

**Why:** The compatibility.json inside the worklets package explicitly lists:
- `0.9.x`: react-native ["0.83", "0.84", "0.85", "0.86"]
- `0.8.x`: react-native ["0.81", "0.82", "0.83", "0.84", "0.85"]

`react-native-reanimated@4.4.1` requires `^0.7.4 || ^0.8.0` (NOT 0.9.x) so 0.8.x is correct.

**How to apply:**
- `artifacts/mora/package.json`: `"react-native-worklets": "~0.8.0"`
- `pnpm-workspace.yaml` overrides: `react-native-worklets: "~0.8.0"` (force all packages)
- If upgrading to RN 0.83+, then upgrading worklets to 0.9.x becomes safe

Also: remove `"esbuild>@esbuild/darwin-arm64"` and `"esbuild>@esbuild/darwin-x64"` overrides
from pnpm-workspace.yaml and set `esbuild: true` in allowBuilds so EAS macOS can get esbuild binary.
