---
name: EAS pnpm ERR_PNPM_IGNORED_BUILDS fix
description: How to fix pnpm v10 ERR_PNPM_IGNORED_BUILDS on EAS iOS builds in a monorepo
---

## The Rule
Add `requiresBuild: true` to each package's **snapshot entry** in `pnpm-lock.yaml` for any package that has build scripts and needs to run them.

**Why:** pnpm v10 with `--frozen-lockfile` determines build approval from the `requiresBuild: true` field in the lockfile's `snapshots:` section — NOT from runtime config files alone. Without this field, pnpm detects the package has build scripts but cannot update the frozen lockfile to record approval → throws `ERR_PNPM_IGNORED_BUILDS`.

**How to apply:** When EAS build fails with `ERR_PNPM_IGNORED_BUILDS` listing packages, find their entries in the `snapshots:` section of `pnpm-lock.yaml` and add `requiresBuild: true` after the last dependency line.

## Packages currently fixed (snapshots section)
- `@firebase/util@1.15.1` → `requiresBuild: true`
- `better-sqlite3@12.10.0` → `requiresBuild: true`
- `esbuild@0.28.1` → `requiresBuild: true`
- `protobufjs@7.6.4` → `requiresBuild: true`

## What DOESN'T work (despite appearing correct)
- `pnpm-workspace.yaml` → `onlyBuiltDependencies` list
- `.npmrc` → `only-built-dependencies[]` entries
- `pnpm-lock.yaml` → `settings.onlyBuiltDependencies` (manually added)
- `package.json` → `pnpm.onlyBuiltDependencies` (deprecated in pnpm v10, shows WARN)

All of these are ignored or insufficient with `--frozen-lockfile` on EAS pnpm v10.

## EAS-specific context
- EAS macOS build machine uses pnpm v10 (newer than local v10.26.1 may differ)
- Error log clue: `[WARN] The "pnpm" field in package.json is no longer read by pnpm`
- EAS detects `artifacts/mora` as workspace entry but uses full 11-package scope
- Lockfile says "up to date" even without `requiresBuild` because resolution hash is unchanged
