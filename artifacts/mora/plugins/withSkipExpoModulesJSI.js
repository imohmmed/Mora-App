const path = require("path");
const fs = require("fs");

// Resolve @expo/config-plugins from mora's own node_modules (pnpm workspace)
const { withDangerousMod } = (() => {
  try {
    return require("@expo/config-plugins");
  } catch {
    const resolved = require.resolve("@expo/config-plugins", {
      paths: [path.resolve(__dirname, "..")],
    });
    return require(resolved);
  }
})();

/**
 * Patches the generated Podfile to stub out the ExpoModulesJSI xcframework
 * build phase. That phase runs a Swift Package Manager resolution against
 * github.com/facebook/react-native which consistently times-out / fails on
 * EAS Build workers. Stubbing the shell script lets the archive proceed
 * without the xcframework (it is a performance optimisation, not required
 * for functionality).
 */
const withSkipExpoModulesJSI = (config) =>
  withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      if (!fs.existsSync(podfilePath)) return config;

      let podfile = fs.readFileSync(podfilePath, "utf8");
      const marker = "# __SKIP_EXPO_MODULES_JSI_XCFRAMEWORK__";
      if (podfile.includes(marker)) return config;

      const hook = `
${marker}
post_install do |installer|
  installer.pods_project.targets.each do |target|
    next unless target.name == 'ExpoModulesJSI'
    target.build_phases.each do |phase|
      next unless phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
      next unless phase.shell_script.to_s.include?('xcframework')
      phase.shell_script = 'echo "xcframework skipped"; exit 0'
    end
  end
end
`;
      fs.writeFileSync(podfilePath, podfile + "\n" + hook);
      return config;
    },
  ]);

module.exports = withSkipExpoModulesJSI;
