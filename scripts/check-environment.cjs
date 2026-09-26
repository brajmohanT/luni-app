/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const babel = require('@babel/core');
const { expoInlineEnvVars } = require('../node_modules/babel-preset-expo/build/plugins/inline-env-vars.js');
const source = fs.readFileSync(path.resolve(__dirname, '../src/lib/config/env.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

test('Expo production transform embeds public configuration without runtime process.env', () => {
  const fixtures = {
    EXPO_PUBLIC_API_URL: ' https://api.example.test/// ',
    EXPO_PUBLIC_SUPABASE_URL: 'https://auth.example.test',
    EXPO_PUBLIC_SUPABASE_KEY: 'test-public-key',
  };
  const original = Object.fromEntries(Object.keys(fixtures).map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, fixtures);
    const transformed = babel.transformSync(js, {
      configFile: false, babelrc: false, caller: { name: 'metro', isDev: false }, plugins: [expoInlineEnvVars],
    }).code;
    const exports = {};
    vm.runInNewContext(transformed, { exports }); // No process global on purpose.
    assert.equal(exports.env.apiUrl, 'https://api.example.test');
    assert.equal(exports.env.supabaseUrl, fixtures.EXPO_PUBLIC_SUPABASE_URL);
    assert.equal(exports.env.supabaseKey, fixtures.EXPO_PUBLIC_SUPABASE_KEY);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
test('missing configuration fails with its variable name, never its value', () => {
  assert.throws(() => vm.runInNewContext(js, { exports: {}, process: { env: {} } }), /Missing EXPO_PUBLIC_API_URL/);
});
