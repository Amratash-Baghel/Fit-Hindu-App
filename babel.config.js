const path = require("path");

/**
 * Introduced by slice 3 (splash) — Reanimated 4 drives the splash motion on the
 * UI thread, and its worklets are compiled by the `react-native-worklets` babel
 * plugin, which MUST be the last plugin. Before this file the project had no
 * babel config and rode Expo's implicit `babel-preset-expo` default; adding a
 * config means we take that preset over explicitly.
 *
 * `babel-preset-expo` is not hoisted to the repo root here (npm nested it under
 * `expo/`), so it is resolved from expo's own location rather than by bare name,
 * which would fail from the project root.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      require.resolve("babel-preset-expo", {
        paths: [path.dirname(require.resolve("expo/package.json"))],
      }),
    ],
    plugins: [require.resolve("react-native-worklets/plugin")],
  };
};
