const path = require("path");
const fs = require("fs");

function loadConfigPlugins() {
  const cacheKey = Object.keys(require.cache).find((k) =>
    k.replace(/\\/g, "/").includes("@expo/config-plugins/build/index.js")
  );
  if (cacheKey) return require.cache[cacheKey].exports;
  return require("@expo/config-plugins");
}

const PATCH_CODE = `
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

      if (podfile.includes("__SKIP_EXPO_MODULES_JSI__")) return cfg;

      // Inject into the existing post_install block (first occurrence)
      const postInstallRegex = /^post_install do \|installer\|/m;
      if (postInstallRegex.test(podfile)) {
        podfile = podfile.replace(
          postInstallRegex,
          `post_install do |installer|\n${PATCH_CODE}`
        );
        fs.writeFileSync(podfilePath, podfile);
        console.log("[withSkipExpoModulesJSI] Injected into existing post_install ✓");
      } else {
        // No post_install found — add our own
        const newBlock = `\npost_install do |installer|\n${PATCH_CODE}\nend\n`;
        fs.writeFileSync(podfilePath, podfile + newBlock);
        console.log("[withSkipExpoModulesJSI] Added new post_install ✓");
      }

      return cfg;
    },
  ]);
};
