// Cross-platform preinstall guard (works on Windows, macOS, Linux).
// 1. Remove stray npm/yarn lockfiles so only pnpm-lock.yaml is used.
// 2. Enforce pnpm as the package manager.
// Replaces the previous `sh -c '...'` script, which failed on Windows
// ("'sh' is not recognized as an internal or external command").
const fs = require("fs");

for (const lockfile of ["package-lock.json", "yarn.lock"]) {
  try {
    fs.rmSync(lockfile, { force: true });
  } catch {
    /* ignore */
  }
}

const ua = process.env.npm_config_user_agent || "";
if (!ua.startsWith("pnpm")) {
  console.error("This project uses pnpm. Run `pnpm install` instead.");
  process.exit(1);
}
