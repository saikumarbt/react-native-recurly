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
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
    return middleware(req, res, next);
  },
};

module.exports = withNativewind(config);
