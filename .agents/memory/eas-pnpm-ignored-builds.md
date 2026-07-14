---
name: EAS pnpm 11 build approvals
description: How pnpm 11 handles build script approvals on EAS — allowBuilds object map replaces onlyBuiltDependencies array
---

## The Rule

In pnpm 11 (used on EAS), build script approval uses `allowBuilds` (object map in
`pnpm-workspace.yaml`), NOT `onlyBuiltDependencies` (array).

`createAllowBuildFunction()` in pnpm 11 reads ONLY `opts3.allowBuilds`.
`onlyBuiltDependencies` is entirely ignored by pnpm 11's build gating logic.

## Behavior

| `allowBuild(depPath)` | Result |
|---|---|
| `true` | Build script runs |
| `false` | Silently skipped, NOT in ignoredBuilds — no error |
| `undefined` (old `onlyBuiltDependencies` behavior) | Added to `ignoredBuilds` → `ERR_PNPM_IGNORED_BUILDS` |

## Our Fix

`pnpm-workspace.yaml` has BOTH keys for dual compatibility:
- `onlyBuiltDependencies` (array) — read by pnpm 10 (local Replit)
- `allowBuilds` (object) — read by pnpm 11 (EAS)

For EAS iOS builds, the 4 problematic packages are set to `false`:
- `@firebase/util: false` — post-install optional, not needed for iOS
- `better-sqlite3: false` — API server only, not needed for iOS
- `esbuild: false` — web bundler; darwin packages also excluded in overrides
- `protobufjs: false` — optional proto download, not needed for iOS

**Why:** `runDepsStatusCheck` in pnpm 11 fires after `pnpm run <script>`.
On fresh EAS install (no workspace-state file), it always spawns a child
`pnpm install` subprocess. That child fails with `ERR_PNPM_IGNORED_BUILDS`
if any `requiresBuild:true` package has `allowBuild===undefined`.
Setting `false` → silently skipped → no error.

**How to apply:** Any new package appearing in `ERR_PNPM_IGNORED_BUILDS` on EAS:
add it to `allowBuilds` in `pnpm-workspace.yaml` as `false` (if iOS doesn't need
its build script) or `true` (if the script is needed and safe on macOS).
