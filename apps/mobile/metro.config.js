const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Merge monorepoRoot with Expo's default watchFolders (do not replace them)
config.watchFolders = [monorepoRoot, ...(config.watchFolders ?? [])];

// Fallback lookup paths (used only when directory-walk finds nothing).
// Root must stay reachable here: @react-navigation/*, axios, zustand,
// socket.io-client and react-native-web are hoisted to the monorepo root's
// node_modules (not duplicated into apps/mobile/node_modules), so cutting off
// root entirely would break resolution of those packages.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force react/react-dom/react-native/react-native-web to always resolve from the
// mobile workspace's own copies, regardless of which package is requiring them.
//
// Why: the root workspace also installs backend React 18 (+ react-dom 18) for
// Next.js. Packages hoisted to the monorepo root (e.g. @react-navigation/*) do
// `require('react')` from inside root/node_modules, and Metro's normal
// hierarchical directory walk *successfully* finds root's react@18.3.1 there —
// so `resolver.extraNodeModules` (a fallback used only when normal resolution
// finds nothing) never even gets consulted. That caused two live React
// instances in the same bundle -> "Invalid hook call" / "Cannot read property
// 'useCallback' of null". A resolveRequest override intercepts these specific
// module names unconditionally, before Metro's normal directory walk runs.
const FORCED_MODULES = ['react', 'react-dom', 'react-native', 'react-native-web'];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isForced = FORCED_MODULES.some(
    (pkg) => moduleName === pkg || moduleName.startsWith(`${pkg}/`)
  );

  if (isForced) {
    // Mobile's own node_modules is checked first so react/react-dom/react-native
    // (which exist there as pinned copies) win; root is a fallback for packages
    // like react-native-web that are only hoisted to root with no duplicate.
    return {
      filePath: require.resolve(moduleName, {
        paths: [path.resolve(projectRoot, 'node_modules'), path.resolve(monorepoRoot, 'node_modules')],
      }),
      type: 'sourceFile',
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
