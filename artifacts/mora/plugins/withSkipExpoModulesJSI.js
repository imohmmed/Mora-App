const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * Removes the ExpoModulesJSI xcframework build script phase from the
 * generated Pods project. The script tries to resolve SPM packages from
 * GitHub and consistently fails on EAS Build workers (network timeout /
 * React-Native SPM manifest not available for the pinned version).
 *
 * The xcframework is only a performance optimisation and is not required
 * for the app to run correctly.
 */
const withSkipExpoModulesJSI = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      if (!fs.existsSync(podfilePath)) return config;

      let podfile = fs.readFileSync(podfilePath, "utf8");

      const patch = `
# ── Fix: skip ExpoModulesJSI xcframework SPM build (fails on EAS) ──────────
post_install do |installer|
  installer.pods_project.targets.each do |target|
    next unless target.name == 'ExpoModulesJSI'
    target.build_phases.each do |phase|
      next unless phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
      next unless phase.shell_script.to_s.include?('xcframework')
      phase.shell_script = 'echo "ExpoModulesJSI xcframework skipped on EAS"; exit 0'
    end
  end
end
`;

      if (!podfile.include("ExpoModulesJSI xcframework skipped on EAS")) {
        podfile = podfile + "\n" + patch;
        fs.writeFileSync(podfilePath, podfile);
      }

      return config;
    },
  ]);
};

module.exports = withSkipExpoModulesJSI;
