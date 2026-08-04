const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Web only: expo-sqlite loads a WebAssembly SQLite build. Let Metro bundle the
// .wasm as an asset, and send the cross-origin-isolation headers wa-sqlite
// needs (OPFS / SharedArrayBuffer) from the web dev server. Native builds use
// the native SQLite engine and are unaffected by any of this.
config.resolver.assetExts.push("wasm");

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    // Cross-origin isolation for wa-sqlite (SharedArrayBuffer/OPFS). Use
    // `credentialless` rather than `require-corp` so cross-origin assets load
    // without needing CORP headers, while isolation stays enabled.
    // NOTE: production web (EAS Hosting) must emit the SAME two headers — set
    // that in the hosting config when the web target is deployed.
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    return middleware(req, res, next);
  },
};

module.exports = withNativewind(config);
