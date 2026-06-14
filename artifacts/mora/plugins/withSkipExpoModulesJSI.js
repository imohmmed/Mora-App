const path = require("path");
const fs = require("fs");

/**
 * Resolves @expo/config-plugins from the module cache (already loaded by
 * eas-cli or expo-cli) so we never need to find it via pnpm's non-flat
 * node_modules layout.
 */
function loadConfigPlugins() {
  // 1. Already in require cache? (true when called by eas-cli OR expo prebuild)
  const cacheKey = Object.keys(require.cache).find((k) =>
    k.replace(/\\/g, "/").includes("@expo/config-plugins/build/index.js")
  );
  if (cacheKey) return require.cache[cacheKey].exports;

  // 2. Direct require — works when expo prebuild is the caller and the
  //    workspace node_modules are on NODE_PATH.
  return require("@expo/config-plugins");
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
      const marker = "# __SKIP_EXPO_MODULES_JSI__";
      if (podfile.includes(marker)) return cfg;

      const hook = `
${marker}
post_install do |installer|
  installer.pods_project.targets.each do |target|
    next unless target.name == "ExpoModulesJSI"
    target.build_phases.each do |phase|
      next unless phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
      next unless phase.shell_script.to_s.include?("xcframework")
      phase.shell_script = 'echo "ExpoModulesJSI xcframework skipped"; exit 0'
    end
  end
end
`;
      fs.writeFileSync(podfilePath, podfile + "\n" + hook);
      console.log("[withSkipExpoModulesJSI] Podfile patched ✓");
      return cfg;
    },
  ]);
};
