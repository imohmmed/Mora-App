const path = require("path");
const fs = require("fs");

function loadConfigPlugins() {
  const cacheKey = Object.keys(require.cache).find((k) =>
    k.replace(/\\/g, "/").includes("@expo/config-plugins/build/index.js")
  );
  if (cacheKey) return require.cache[cacheKey].exports;
  return require("@expo/config-plugins");
}

const INJECTED_CODE = [
  "  # __SKIP_EXPO_MODULES_JSI__",
  "  installer.pods_project.targets.each do |target|",
  '    next unless target.name == "ExpoModulesJSI"',
  "    target.build_phases.each do |phase|",
  "      next unless phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)",
  '      next unless phase.shell_script.to_s.include?("xcframework")',
  "      phase.shell_script = 'echo \"ExpoModulesJSI xcframework skipped\"; exit 0'",
  "    end",
  "  end",
].join("\n");

/**
 * Find all `post_install do |var|...end` blocks in the Podfile.
 *
 * Key insight: `post_install` and its closing `end` are ALWAYS at column 0.
 * Every `end` INSIDE the block is indented (≥1 space).
 * This avoids fragile depth-counting across Ruby's many block styles.
 */
function extractPostInstalls(lines) {
  const bodies = [];
  const removedRanges = [];
  let i = 0;

  while (i < lines.length) {
    if (/^post_install do \|\w+\|/.test(lines[i])) {
      const blockStart = i;
      const body = [];
      i++;

      while (i < lines.length) {
        const line = lines[i];
        // Closing `end` is at column 0 (no leading whitespace)
        if (/^end\s*$/.test(line)) {
          removedRanges.push([blockStart, i]);
          i++;
          break;
        }
        body.push(line);
        i++;
      }

      bodies.push(body.join("\n"));
    } else {
      i++;
    }
  }

  return { bodies, removedRanges };
}

function mergePostInstalls(podfile) {
  const lines = podfile.split("\n");
  const { bodies, removedRanges } = extractPostInstalls(lines);

  if (bodies.length === 0) {
    return podfile + "\npost_install do |installer|\n" + INJECTED_CODE + "\nend\n";
  }

  // Remove all existing blocks (reverse order keeps indices valid)
  const resultLines = lines.slice();
  for (const [start, end] of removedRanges.slice().reverse()) {
    resultLines.splice(start, end - start + 1);
  }

  // One merged block: all original bodies + our patch
  const mergedBody = bodies.join("\n") + "\n" + INJECTED_CODE;
  return (
    resultLines.join("\n") +
    "\npost_install do |installer|\n" +
    mergedBody +
    "\nend\n"
  );
}

module.exports = function withSkipExpoModulesJSI(config) {
  const { withDangerousMod } = loadConfigPlugins();

  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile"
      );
      if (!fs.existsSync(podfilePath)) return cfg;

      let podfile = fs.readFileSync(podfilePath, "utf8");
      if (podfile.includes("__SKIP_EXPO_MODULES_JSI__")) {
        console.log("[withSkipExpoModulesJSI] Already patched, skipping");
        return cfg;
      }

      const patched = mergePostInstalls(podfile);
      fs.writeFileSync(podfilePath, patched);
      console.log(
        "[withSkipExpoModulesJSI] post_install blocks merged and patched ✓"
      );
      return cfg;
    },
  ]);
};
