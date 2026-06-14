#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "→ Running expo prebuild --clean"
npx expo prebuild --clean --platform ios

echo "→ Patching Podfile (skip ExpoModulesJSI xcframework)"
node "$SCRIPT_DIR/patch-podfile.js"

echo "✓ Prebuild complete"
