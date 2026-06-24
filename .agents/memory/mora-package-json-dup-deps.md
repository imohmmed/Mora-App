---
name: Mora package.json duplicate core deps
description: artifacts/mora/package.json lists expo/react/react-native in BOTH dependency blocks with conflicting versions
---

## Issue
`artifacts/mora/package.json` declares `expo`, `react`, and `react-native` in BOTH `devDependencies`
and `dependencies`, with DIVERGENT versions:
- devDependencies (authoritative, used everywhere): `expo ~56.0.11`, `react catalog:`, `react-native 0.81.5`
- dependencies (stray/wrong): `expo ~56.0.0-preview.8`, `react 19.2.3`, `react-native 0.85.3`

The `dependencies` versions are bogus for Expo SDK 56 (RN 0.85.3 / expo preview do not pair with SDK 56)
and look accidentally added. `expo prebuild` and TestFlight builds currently succeed despite this, so
pnpm is resolving the devDependencies set in practice — but it is a latent EAS/install-consistency
landmine flagged during code review.

**Why it matters:** a clean reinstall or EAS version bump could resolve the conflicting `dependencies`
entries and pull an incompatible expo/react-native, breaking the build in a way that's hard to trace.

**How to apply:** if you ever touch this file or chase a "wrong expo/RN version installed" bug, the fix
is to delete the three stray `dependencies` entries (expo/react/react-native) so only the
devDependencies set remains, then reinstall + `expo prebuild --clean` + build to confirm. Left in place
this session because it is pre-existing, out of scope, and changing it forces a risky reinstall cycle
the user should sign off on.
