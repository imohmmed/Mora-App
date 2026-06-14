const path = require("path");
const fs = require("fs");

/**
 * Lazy-loaded config plugin — @expo/config-plugins is required only when
 * expo prebuild actually calls the function (NOT at eas-cli import time).
 * This sidesteps the pnpm workspace module-resolution issue that causes
 * eas-cli to reject the plugin before uploading.
 */
module.exports = function withSkipExpoModulesJSI(config) {
  // Dynamic require: runs inside expo-prebuild's own Node context
  // where @expo/config-plugins is always available.
  const { withDangerousMod } = require("@expo/config-plugins");

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

      const hook = [
        "",
        marker,
        'post_install do |installer|',
        '  installer.pods_project.targets.each do |target|',
        '    next unless target.name == "ExpoModulesJSI"',
        '    target.build_phases.each do |phase|',
        '      next unless phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)',
        '      next unless phase.shell_script.to_s.include?("xcframework")',
        '      phase.shell_script = \'echo "ExpoModulesJSI xcframework skipped"; exit 0\'',
        '    end',
        '  end',
        'end',
        "",
      ].join("\n");

      fs.writeFileSync(podfilePath, podfile + hook);
      console.log("[withSkipExpoModulesJSI] Podfile patched ✓");
      return cfg;
    },
  ]);
};
