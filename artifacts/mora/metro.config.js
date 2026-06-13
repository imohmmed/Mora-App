const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Exclude pnpm post-install temp build dirs from the file watcher.
// Metro's FallbackWatcher crashes when it tries to watch a directory
// that gets cleaned up after package post-install scripts (e.g. @isaacs/cliui_tmp_*).
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
