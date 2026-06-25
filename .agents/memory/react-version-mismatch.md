---
name: React version mismatch in mora Expo web
description: mora/package.json had duplicate react/expo/react-native in both deps and devDeps with conflicting versions, causing React error #527 on web (blank screen)
---

## Rule
Never add `react`, `react-dom`, `expo`, or `react-native` to `dependencies` in `mora/package.json`. Use only the `devDependencies` entries (which use `catalog:` pinned to 19.1.0).

## Why
The pnpm catalog pins `react: 19.1.0` and `react-dom: 19.1.0` with the comment "Must be this exact version because expo requires it". If `react: "19.2.3"` is in `dependencies`, Metro/Expo web bundler picks up 19.2.3 for react but 19.1.0 for react-dom → React error #527 → blank white screen on web.

## How to apply
If mora/package.json `dependencies` ever gets `react`, `react-dom`, `expo`, or `react-native` added (e.g. by EAS config changes), remove them. The correct versions live in `devDependencies` as `catalog:`.

Check: `cat artifacts/mora/node_modules/react/package.json | grep '"version"'` — must be 19.1.0 before doing expo export.
