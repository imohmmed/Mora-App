const path = require("path");
const fs = require("fs");

function loadConfigPlugins() {
  const cacheKey = Object.keys(require.cache).find((k) =>
    k.replace(/\\/g, "/").includes("@expo/config-plugins/build/index.js")
  );
  if (cacheKey) return require.cache[cacheKey].exports;
  return require("@expo/config-plugins");
}

// Our xcframework patch lines (without indentation — added dynamically)
const PATCH_LINES = [
  "# __SKIP_EXPO_MODULES_JSI__",
  "installer.pods_project.targets.each do |target|",
  '  next unless target.name == "ExpoModulesJSI"',
  "  target.build_phases.each do |phase|",
  "    next unless phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)",
  '    next unless phase.shell_script.to_s.include?("xcframework")',
  "    phase.shell_script = 'echo \"ExpoModulesJSI xcframework skipped\"; exit 0'",
  "  end",
  "end",
];

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Find all post_install blocks regardless of indentation level.
 * Uses same-indent matching for the closing 'end'.
 */
function findPostInstalls(lines) {
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^(\s*)post_install do \|\w+\|/);
    if (m) {
      const indent = m[1]; // e.g. "  " or ""
      const start = i;
      const body = [];
      i++;
      const closingRe = new RegExp(`^${escRe(indent)}end\\s*$`);
      while (i < lines.length) {
        if (closingRe.test(lines[i])) {
          blocks.push({ start, end: i, indent, body: body.join("\n") });
          i++;
          break;
        }
        body.push(lines[i]);
        i++;
      }
    } else {
      i++;
    }
  }
  return blocks;
}

function patchPodfile(podfile) {
  const lines = podfile.split("\n");
  const blocks = findPostInstalls(lines);

  console.log(`[withSkipExpoModulesJSI] Found ${blocks.length} post_install block(s)`);

  const contentIndent = (blocks[0]?.indent ?? "") + "  ";
  const patchCode = PATCH_LINES.map((l) => (l ? contentIndent + l : "")).join("\n");

  if (blocks.length === 0) {
    // No post_install at all — add a top-level one
    return podfile + "\npost_install do |installer|\n" + patchCode + "\nend\n";
  }

  // Strategy:
  //  1. Inject our patch + any extra blocks' bodies INTO the FIRST block
  //  2. Remove all extra blocks (indices may shift — process in reverse)
  const extraBodies = blocks
    .slice(1)
    .map((b) => b.body)
    .filter(Boolean)
    .join("\n");

  const insertion =
    (extraBodies ? extraBodies + "\n" : "") + patchCode;

  const resultLines = lines.slice();

  // Remove extra blocks in reverse order (preserves indices of earlier lines)
  for (const block of blocks.slice(1).reverse()) {
    resultLines.splice(block.start, block.end - block.start + 1);
  }

  // Insert into first block right after the opening `post_install do` line
  resultLines.splice(blocks[0].start + 1, 0, ...insertion.split("\n"));

  return resultLines.join("\n");
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

      const patched = patchPodfile(podfile);
      fs.writeFileSync(podfilePath, patched);
      console.log("[withSkipExpoModulesJSI] Podfile patched ✓");
      return cfg;
    },
  ]);
};
