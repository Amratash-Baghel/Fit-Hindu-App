// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Deno source, not app source — see the note in tsconfig.json.
    ignores: ["dist/*", "supabase/functions/**"],
  }
]);
