---
name: pnpm override semver ranges pull breaking majors
description: CVE-fix overrides using ">=X" silently upgraded to a new major and broke the RN/Expo iOS build
---

## Rule
In `pnpm-workspace.yaml` `overrides`, pin CVE fixes with a **caret** (`^X.Y.Z`), not an open `>=X.Y.Z`. An open `>=` lets pnpm resolve to the next **major**, which breaks the toolchain.

**Why:** A security pass set `"@babel/core": ">=7.29.6"` and `js-yaml: ">=4.2.0"`. pnpm resolved `@babel/core` to **8.0.1** and js-yaml to **5.x**. Babel 8 is a breaking major; every RN/Expo native module's `react-native.config.js` requires Babel `^7.0.0`, so `expo-modules-autolinking react-native-config` threw `Requires Babel "^7.0.0-0", but was loaded with "8.0.1"`, produced empty stdout, and EAS `pod install` died with `Invalid Podfile … unexpected token at ''` plus a misleading "add @react-native-community/cli" hint. The real cause was the override, not a missing CLI.

**How to apply:** When adding/auditing override entries that fix CVEs, use the patched version's caret range (`^7.29.6`, `^4.2.0`) so it stays inside the compatible major. The patched versions for these two CVEs are `@babel/core` 7.29.6 and `js-yaml` 4.2.0 — both have caret-safe fixes; no need to jump majors.

## How to diagnose this class of failure fast
Reproduce the exact EAS step locally (no full build needed):
```
cd artifacts/mora
node --no-warnings --eval "require('expo/bin/autolinking')" expo-modules-autolinking react-native-config --json --platform ios
```
Exit 0 + JSON = healthy. A Babel/version error here is the same thing that kills `pod install` on EAS. After fixing, also re-run the `@bacons/apple-targets` image-utils symlink (see bacons-apple-targets-pnpm.md) and restart the mora workflow.
