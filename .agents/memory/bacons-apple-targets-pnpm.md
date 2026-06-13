---
name: bacons-apple-targets pnpm fix
description: @bacons/apple-targets fails in pnpm monorepo due to missing @expo/image-utils; also metro crashes on pnpm _tmp_ build dirs
---

## Rule
When using `@bacons/apple-targets` in a pnpm workspace, manually symlink `@expo/image-utils` into its isolated node_modules after install:

```bash
APPLE_DIR=$(ls -d node_modules/.pnpm/@bacons+apple-targets@*/node_modules/@bacons/apple-targets)
IMG_DIR=$(ls -d node_modules/.pnpm/@expo+image-utils@*/node_modules/@expo/image-utils)
mkdir -p "$APPLE_DIR/node_modules/@expo"
ln -sfn "$IMG_DIR" "$APPLE_DIR/node_modules/@expo/image-utils"
```

Also add to `metro.config.js` to prevent crashes from pnpm post-install `_tmp_` build directories:

```js
config.resolver.blockList = [
  ...blockListArray,
  /node_modules[/\\].*_tmp_[^/\\]*[/\\]/,
];
```

**Why:** pnpm strict isolation means `@bacons/apple-targets` can't find `@expo/image-utils` via normal resolution. Metro's FallbackWatcher also crashes if it tries to watch a temp dir that pnpm cleans up after post-install scripts.

**How to apply:** After any `pnpm install` in the mora workspace, re-run the symlink command. The metro.config.js fix is persistent.
