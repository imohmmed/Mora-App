const path = require("path");
const fs = require("fs");

function loadConfigPlugins() {
  const cacheKey = Object.keys(require.cache).find((k) =>
    k.replace(/\\/g, "/").includes("@expo/config-plugins/build/index.js")
  );
  if (cacheKey) return require.cache[cacheKey].exports;
  return require("@expo/config-plugins");
}

const INJECTED_CODE = `
  # __SKIP_EXPO_MODULES_JSI__
  installer.pods_project.targets.each do |target|
    next unless target.name == "ExpoModulesJSI"
    target.build_phases.each do |phase|
      next unless phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
      next unless phase.shell_script.to_s.include?("xcframework")
      phase.shell_script = 'echo "ExpoModulesJSI xcframework skipped"; exit 0'
    end
  end
`;

/**
 * Extracts all post_install blocks from the Podfile lines.
 * Returns { bodies: string[], removedRanges: [start, end][] }
 * Uses a depth counter to handle nested do...end blocks.
 */
function extractPostInstalls(lines) {
  const bodies = [];
  const removedRanges = [];
  let i = 0;

  while (i < lines.length) {
    if (/^post_install do \|\w+\|/.test(lines[i])) {
      const blockStart = i;
      let depth = 1;
      const body = [];
      i++;

      while (i < lines.length && depth > 0) {
        const line = lines[i];

        if (/\bdo\s*(\|[^|]*\|)?\s*$/.test(line)) {
          depth++;
          body.push(line);
        } else if (/^\s*end\s*(#.*)?$/.test(line)) {
          depth--;
          if (depth === 0) {
            removedRanges.push([blockStart, i]);
          } else {
            body.push(line);
          }
        } else {
          body.push(line);
        }
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
    // No existing post_install — add a new one
    return (
      podfile +
      `\npost_install do |installer|\n${INJECTED_CODE}\nend\n`
    );
  }

  // Remove all existing post_install blocks (reverse order keeps indices valid)
  const resultLines = lines.slice();
  for (const [start, end] of removedRanges.slice().reverse()) {
    resultLines.splice(start, end - start + 1);
  }

  // One merged block containing all original bodies + our patch
  const mergedBody = bodies.join("\n") + "\n" + INJECTED_CODE;
  const mergedBlock =
    "\npost_install do |installer|\n" + mergedBody + "\nend\n";

  return resultLines.join("\n") + mergedBlock;
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
      console.log("[withSkipExpoModulesJSI] post_install blocks merged and patched ✓");
      return cfg;
    },
  ]);
};
