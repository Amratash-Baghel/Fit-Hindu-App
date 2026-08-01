// Expo's default Metro config, plus a guard that .m4a is treated as a bundled
// asset (the B5 launch audio — Om chant + sleep flute — ships in the app for
// offline/instant playback). Expo's defaults usually already include m4a; the
// idempotent check makes the bundling explicit and future-proof.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
if (!config.resolver.assetExts.includes("m4a")) {
  config.resolver.assetExts.push("m4a");
}

module.exports = config;
