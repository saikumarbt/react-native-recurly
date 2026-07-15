module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo (SDK 54) auto-includes react-native-worklets/plugin when
  // reanimated is installed — this is what makes Reanimated worklets actually
  // run. NativeWind v5 is handled by Metro's withNativewind() (metro.config.js),
  // not Babel, so the two coexist.
  return {
    presets: ["babel-preset-expo"],
  };
};
