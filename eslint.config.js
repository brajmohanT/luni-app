const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: ['.expo/**', 'dist/**', 'web-build/**', 'android/**', 'ios/**', 'docs/design/**'],
  },
  expoConfig,
  {
    files: ['scripts/check-brand.cjs', 'scripts/check-controls.cjs'],
    languageOptions: { globals: { __dirname: 'readonly' } },
  },
]);
