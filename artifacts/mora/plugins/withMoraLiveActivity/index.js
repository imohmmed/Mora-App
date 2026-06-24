// =====================================================================
//  withMoraLiveActivity — Expo config plugin (self-contained)
// =====================================================================
//
//  Replaces `@bacons/apple-targets` for the Live Activity widget. On
//  every `expo prebuild --clean` (ios/ is gitignored, so EAS regenerates
//  the Xcode project from scratch) this plugin PROGRAMMATICALLY:
//    1. Sets NSSupportsLiveActivities (+ FrequentUpdates) on the host
//       Info.plist — required for ActivityKit to load at all.
//    2. Creates a brand-new PBXNativeTarget "MoraOrderWidget" (Widget
//       Extension, productType app-extension) with its Swift sources,
//       Info.plist, bundle id, build settings, AND the host app's
//       "Embed Foundation Extensions" copy phase that embeds the
//       resulting .appex into the host bundle.
//    3. Physically copies the widget source files into the generated
//       `ios/MoraOrderWidget/` tree so xcodebuild has them.
//
//  The host-side ActivityKit calls live in the Expo native module
//  (modules/MoraLiveActivity), which autolinks normally — so unlike
//  Carti this plugin does NOT touch the main app target. The shared
//  `MoraOrderActivityAttributes` struct is declared independently in
//  both the module and the widget; ActivityKit matches across the
//  host<->widget process boundary on the UNQUALIFIED type name +
//  Codable structure, so two byte-compatible copies are equivalent.
//
//  Idempotent: every mod checks for prior state and is a no-op on re-run.
// =====================================================================

const { withInfoPlist, withDangerousMod, withXcodeProject } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

// Source files live OUTSIDE any dir named "ios" — artifacts/mora/.gitignore
// has an `ios/` rule that also ignores `plugins/.../ios/`, which would strip
// the widget sources from the EAS clone and break prebuild.
const EXT_DIR = path.join(__dirname, "MoraOrderWidget");

const EXT_TARGET_NAME = "MoraOrderWidget";
const EXT_BUNDLE_ID = "app.mora1.com.widget";
const EXT_DEPLOYMENT_TARGET = "16.1";

// Files that make up the widget extension target. Swift → Compile
// Sources, Info.plist → INFOPLIST_FILE (not a Resource).
const EXT_FILES = ["MoraOrderActivity.swift", "Info.plist"];

const stripQuotes = (s) => (typeof s === "string" ? s.replace(/^"(.*)"$/, "$1") : s);

// ── 1. Info.plist patch ───────────────────────────────────────────────
function withMoraInfoPlist(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSSupportsLiveActivities = true;
    cfg.modResults.NSSupportsLiveActivitiesFrequentUpdates = true;
    return cfg;
  });
}

// ── 2. Programmatic Widget Extension target creation ──────────────────
function withWidgetExtensionTarget(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;

    // Idempotent guard — walk the native-target section and strip quotes
    // (pbxTargetByName compares against a quoted comment and misses).
    const existingTargets = project.pbxNativeTargetSection() || {};
    for (const [uuid, t] of Object.entries(existingTargets)) {
      if (typeof t === "string") continue;
      if (uuid.endsWith("_comment")) continue;
      if (stripQuotes(t.name || "") === EXT_TARGET_NAME) return cfg; // already added
    }

    // ── Resolve DEVELOPMENT_TEAM (Xcode 14+ refuses to archive an
    //    Automatic-signed target without one). Order: APPLE_TEAM_ID env,
    //    app.json ios.appleTeamId, then the host app target's value.
    let resolvedTeamId =
      (process.env.APPLE_TEAM_ID && process.env.APPLE_TEAM_ID.trim()) ||
      (cfg.ios && cfg.ios.appleTeamId && String(cfg.ios.appleTeamId).trim()) ||
      "";

    if (!resolvedTeamId) {
      const buildConfigsSection = project.pbxXCBuildConfigurationSection();
      const xcConfigList = project.pbxXCConfigurationList();
      for (const [uuid, t] of Object.entries(existingTargets)) {
        if (typeof t === "string") continue;
        if (uuid.endsWith("_comment")) continue;
        if (stripQuotes(t.productType || "") !== "com.apple.product-type.application") continue;
        const list = xcConfigList[t.buildConfigurationList];
        const entries = (list && list.buildConfigurations) || [];
        for (const entry of entries) {
          const bc = buildConfigsSection[entry.value];
          const team = bc && bc.buildSettings && bc.buildSettings.DEVELOPMENT_TEAM;
          if (team && stripQuotes(String(team)).trim()) {
            resolvedTeamId = stripQuotes(String(team)).trim();
            break;
          }
        }
        if (resolvedTeamId) break;
      }
    }

    if (!resolvedTeamId) {
      console.warn(
        "[withMoraLiveActivity] Could not resolve DEVELOPMENT_TEAM for the widget " +
          "extension. Set APPLE_TEAM_ID env / app.json ios.appleTeamId, or ensure the " +
          "host target has a team, or `xcodebuild archive` will fail with a signing error.",
      );
    }

    // addTarget wires: the PBXNativeTarget (app-extension), Debug+Release
    // build configs, the host's "Embed Foundation Extensions" copy phase
    // (dstSubfolderSpec=13 → PlugIns) + a host→ext target dependency.
    const newTarget = project.addTarget(EXT_TARGET_NAME, "app_extension", EXT_TARGET_NAME, EXT_BUNDLE_ID);
    const targetUuid = newTarget.uuid;

    const extSwiftFiles = EXT_FILES.filter((f) => f.endsWith(".swift")).map(
      (f) => `${EXT_TARGET_NAME}/${f}`,
    );
    project.addBuildPhase(extSwiftFiles, "PBXSourcesBuildPhase", "Sources", targetUuid);
    project.addBuildPhase([], "PBXFrameworksBuildPhase", "Frameworks", targetUuid);
    project.addBuildPhase([], "PBXResourcesBuildPhase", "Resources", targetUuid);

    // Build-setting overrides. addTarget defaults INFOPLIST_FILE to
    // "<folder>/<folder>-Info.plist" — point it at our staged "Info.plist".
    const xcConfigList = project.pbxXCConfigurationList();
    const buildConfigsSection = project.pbxXCBuildConfigurationSection();
    const configList = xcConfigList[newTarget.pbxNativeTarget.buildConfigurationList];

    const sharedSettings = {
      INFOPLIST_FILE: `"${EXT_TARGET_NAME}/Info.plist"`,
      PRODUCT_BUNDLE_IDENTIFIER: `"${EXT_BUNDLE_ID}"`,
      PRODUCT_NAME: `"${EXT_TARGET_NAME}"`,
      IPHONEOS_DEPLOYMENT_TARGET: EXT_DEPLOYMENT_TARGET,
      SWIFT_VERSION: "5.0",
      TARGETED_DEVICE_FAMILY: '"1,2"',
      CODE_SIGN_STYLE: "Automatic",
      ...(resolvedTeamId ? { DEVELOPMENT_TEAM: resolvedTeamId } : {}),
      CURRENT_PROJECT_VERSION: "1",
      MARKETING_VERSION: "1.0",
      GENERATE_INFOPLIST_FILE: "NO",
      LD_RUNPATH_SEARCH_PATHS:
        '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
      SKIP_INSTALL: "YES",
      ALWAYS_SEARCH_USER_PATHS: "NO",
      CLANG_ENABLE_MODULES: "YES",
      CLANG_ENABLE_OBJC_ARC: "YES",
      ENABLE_USER_SCRIPT_SANDBOXING: "NO",
      ENABLE_STRICT_OBJC_MSGSEND: "YES",
      SWIFT_EMIT_LOC_STRINGS: "YES",
    };
    const debugSettings = {
      DEBUG_INFORMATION_FORMAT: "dwarf",
      MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
      ONLY_ACTIVE_ARCH: "YES",
      SWIFT_ACTIVE_COMPILATION_CONDITIONS: '"DEBUG $(inherited)"',
      SWIFT_OPTIMIZATION_LEVEL: '"-Onone"',
      COPY_PHASE_STRIP: "NO",
    };
    const releaseSettings = {
      DEBUG_INFORMATION_FORMAT: '"dwarf-with-dsym"',
      MTL_ENABLE_DEBUG_INFO: "NO",
      SWIFT_COMPILATION_MODE: "wholemodule",
      SWIFT_OPTIMIZATION_LEVEL: '"-O"',
      COPY_PHASE_STRIP: "NO",
      ENABLE_NS_ASSERTIONS: "NO",
    };

    const configEntries = (configList && configList.buildConfigurations) || [];
    for (const entry of configEntries) {
      const buildCfg = buildConfigsSection[entry.value];
      if (!buildCfg || !buildCfg.buildSettings) continue;
      Object.assign(buildCfg.buildSettings, sharedSettings);
      const isDebug = stripQuotes(buildCfg.name) === "Debug";
      Object.assign(buildCfg.buildSettings, isDebug ? debugSettings : releaseSettings);
    }

    // ── Declare the widget as a TARGET DEPENDENCY of the host app target.
    //    node-xcode's addTarget() created the "Embed Foundation Extensions"
    //    copy-files phase + the .appex product reference, but it does NOT add a
    //    PBXTargetDependency. Both `eas credentials` (GENERIC workflow, when a
    //    local ios/ exists) and EAS Build discover embedded app-extension
    //    targets by walking the HOST target's `dependencies` array. With no
    //    PBXTargetDependency the widget is invisible to provisioning → the
    //    "Select target" step never appears and the build fails with
    //    "No profiles for 'app.mora1.com.widget'". Add it explicitly.
    let hostTargetUuid;
    for (const [uuid, t] of Object.entries(project.pbxNativeTargetSection() || {})) {
      if (typeof t !== "object" || uuid.endsWith("_comment")) continue;
      if (stripQuotes(t.productType || "") === "com.apple.product-type.application") {
        hostTargetUuid = uuid;
        break;
      }
    }

    if (hostTargetUuid) {
      // node-xcode 3.x's addTargetDependency() only pushes the dependency when
      // the PBXTargetDependency / PBXContainerItemProxy sections ALREADY exist
      // (it guards on `if (proxySection && depSection)`). A fresh Expo prebuild
      // has neither section, so the call would be a silent no-op. Pre-create the
      // empty sections (and ensure the host's `dependencies` array exists) so
      // the built-in does its job and serializes correctly.
      const objects = project.hash.project.objects;
      objects.PBXTargetDependency = objects.PBXTargetDependency || {};
      objects.PBXContainerItemProxy = objects.PBXContainerItemProxy || {};
      const hostTarget = project.pbxNativeTargetSection()[hostTargetUuid];
      if (!Array.isArray(hostTarget.dependencies)) hostTarget.dependencies = [];

      if (typeof project.addTargetDependency === "function") {
        project.addTargetDependency(hostTargetUuid, [targetUuid]);
      } else {
        // Manual fallback for non-3.x node-xcode.
        const depUuid = project.generateUuid();
        const proxyUuid = project.generateUuid();
        objects.PBXContainerItemProxy[proxyUuid] = {
          isa: "PBXContainerItemProxy",
          containerPortal: project.hash.project.rootObject,
          containerPortal_comment: "Project object",
          proxyType: 1,
          remoteGlobalIDString: targetUuid,
          remoteInfo: EXT_TARGET_NAME,
        };
        objects.PBXContainerItemProxy[`${proxyUuid}_comment`] = "PBXContainerItemProxy";
        objects.PBXTargetDependency[depUuid] = {
          isa: "PBXTargetDependency",
          target: targetUuid,
          target_comment: EXT_TARGET_NAME,
          targetProxy: proxyUuid,
          targetProxy_comment: "PBXContainerItemProxy",
        };
        objects.PBXTargetDependency[`${depUuid}_comment`] = "PBXTargetDependency";
        hostTarget.dependencies.push({ value: depUuid, comment: "PBXTargetDependency" });
      }
    }

    return cfg;
  });
}

// ── 3. File staging via dangerousMod ──────────────────────────────────
function withMoraLiveActivityFiles(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot;

      const missing = EXT_FILES.filter((f) => !fs.existsSync(path.join(EXT_DIR, f)));
      if (missing.length) {
        throw new Error(
          `[withMoraLiveActivity] Missing source files in plugins/withMoraLiveActivity/ios/MoraOrderWidget: ${missing.join(", ")}`,
        );
      }

      const extOutDir = path.join(iosRoot, EXT_TARGET_NAME);
      if (!fs.existsSync(extOutDir)) fs.mkdirSync(extOutDir, { recursive: true });
      for (const f of EXT_FILES) {
        fs.copyFileSync(path.join(EXT_DIR, f), path.join(extOutDir, f));
      }

      return cfg;
    },
  ]);
}

module.exports = function withMoraLiveActivity(config) {
  config = withMoraInfoPlist(config);
  config = withWidgetExtensionTarget(config);
  config = withMoraLiveActivityFiles(config);
  return config;
};
