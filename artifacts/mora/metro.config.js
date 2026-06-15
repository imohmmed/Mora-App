const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo support: let Metro find modules installed at workspace root
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Exclude pnpm post-install temp build dirs from the file watcher.
const originalBlockList = config.resolver.blockList || [];
const blockListArray = Array.isArray(originalBlockList)
  ? originalBlockList
  : [originalBlockList];

config.resolver.blockList = [
  ...blockListArray,
  /node_modules[/\\].*_tmp_[^/\\]*[/\\]/,
  /node_modules[/\\]\.pnpm[/\\].*_tmp_[^/\\]*/,
];

module.exports = config;
