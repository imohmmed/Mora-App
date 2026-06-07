---
name: better-sqlite3 native compilation on Replit
description: How to compile the better-sqlite3 native module when pnpm's build approval blocks it and no prebuilds exist for Node v24.
---

## The problem
`pnpm install` marks `better-sqlite3` as needing a build script, but the interactive `pnpm approve-builds` prompt cannot be answered non-interactively. No prebuilt binaries exist for Node v24.13.0 (napi v137) on linux-x64, so `require('better-sqlite3')` throws "Could not locate the bindings file."

## The fix (two steps)

### 1. Install python3 (required by node-gyp)
```sh
nix-env -iA nixpkgs.python3
```
This installs python3 to `~/.nix-profile/bin/python3`.

### 2. Configure then build with node-gyp
```sh
npm install -g node-gyp   # puts node-gyp at ~/.config/npm/node_global/bin/node-gyp

cd /home/runner/workspace/node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3

PYTHON=~/.nix-profile/bin/python3 ~/.config/npm/node_global/bin/node-gyp configure --python=~/.nix-profile/bin/python3
PYTHON=~/.nix-profile/bin/python3 ~/.config/npm/node_global/bin/node-gyp build
```
The `build/Release/better_sqlite3.node` file is produced. After this `require('better-sqlite3')` works.

**Why:** make/gcc/g++ are available via the Replit runtime path, but python3 is not in the default PATH — node-gyp's configure step requires it.

**How to apply:** Run these two steps whenever a fresh `pnpm install` is run (which wipes node_modules) or after a new Replit environment is created. Consider automating in a post-install script.
