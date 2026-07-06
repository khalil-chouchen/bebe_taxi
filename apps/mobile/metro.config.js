const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Merge monorepoRoot with Expo's default watchFolders (do not replace them)
config.watchFolders = [monorepoRoot, ...(config.watchFolders ?? [])];

// Fallback lookup paths (used only when directory-walk finds nothing)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Pin react and react-native to the mobile workspace's versions.
//
// Why: packages hoisted to the root node_modules (expo-font, react-navigation, etc.)
// resolve "react-native" via normal directory-walk and land on the root's older
// react-native@0.76.9 BEFORE nodeModulesPaths is ever consulted. That creates a
// mixed bundle (some modules on 0.76, some on 0.81) which breaks TurboModule
// initialisation (PlatformConstants not found). extraNodeModules is highest priority
// and forces every require('react-native') and require('react') in the entire bundle
// to resolve from the mobile workspace, regardless of where the importing file lives.
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules', 'react'),
  'react-native': path.resolve(projectRoot, 'node_modules', 'react-native'),
};

module.exports = config;
