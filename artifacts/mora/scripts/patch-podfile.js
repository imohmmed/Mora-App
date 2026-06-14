#!/usr/bin/env node
/**
 * Patches the generated ios/Podfile to stub out the ExpoModulesJSI
 * xcframework build phase. That phase runs Swift Package Manager
 * against github.com/facebook/react-native and consistently fails on
 * EAS Build workers. Stubbing it lets the archive succeed; the
 * xcframework is a performance optimisation, not a functional requirement.
 *
 * Run automatically via eas.json prebuildCommand after expo prebuild.
 */
const path = require("path");
const fs = require("fs");

const podfilePath = path.resolve(__dirname, "../ios/Podfile");

if (!fs.existsSync(podfilePath)) {
  console.log("patch-podfile: ios/Podfile not found – skipping");
  process.exit(0);
}

let podfile = fs.readFileSync(podfilePath, "utf8");
const marker = "# __SKIP_EXPO_MODULES_JSI__";

if (podfile.includes(marker)) {
  console.log("patch-podfile: already patched – skipping");
  process.exit(0);
}

const hook = `
${marker}
post_install do |installer|
  installer.pods_project.targets.each do |target|
    next unless target.name == "ExpoModulesJSI"
    target.build_phases.each do |phase|
      next unless phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
      next unless phase.shell_script.to_s.include?("xcframework")
      phase.shell_script = 'echo "ExpoModulesJSI xcframework build skipped on EAS"; exit 0'
    end
  end
end
`;

fs.writeFileSync(podfilePath, podfile + "\n" + hook);
console.log("patch-podfile: Podfile patched ✓");
