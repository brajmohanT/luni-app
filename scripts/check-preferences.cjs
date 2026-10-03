/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function load(file) {
  const filename = path.resolve(__dirname, '..', file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => {
    throw new Error(`Unexpected import ${name}`);
  } }, { filename });
  return exports;
}

const preferences = load('src/lib/database/preferences.ts');
const migrations = load('src/lib/database/migrations.ts');

test('appearance parsing accepts supported values and rejects invalid storage', () => {
  assert.equal(preferences.parseThemePreference('light'), 'light');
  assert.equal(preferences.parseThemePreference('dark'), 'dark');
  assert.equal(preferences.parseThemePreference('system'), 'system');
  assert.equal(preferences.parseThemePreference('unknown'), 'system');
  assert.equal(preferences.parseThemePreference(null), 'system');
});

test('appearance reads synchronously before the app theme renders', () => {
  const calls = [];
  const db = {
    getFirstSync(...args) {
      calls.push(args);
      return { value: 'dark' };
    },
  };
  assert.equal(preferences.readThemePreference(db), 'dark');
  assert.match(calls[0][0], /app_preferences/);
  assert.equal(calls[0][1], 'appearance');
});

test('appearance writes one device-wide upsert', async () => {
  let call;
  const db = { async runAsync(...args) { call = args; } };
  await preferences.writeThemePreference(db, 'light');
  assert.match(call[0], /ON CONFLICT\(key\)/);
  assert.deepEqual(call.slice(1), ['appearance', 'light']);
});

test('database version 2 adds the preferences table and advances to version 3', async () => {
  const statements = [];
  const db = {
    async getFirstAsync() { return { user_version: 2 }; },
    async execAsync(statement) { statements.push(statement); },
  };
  await migrations.migrateDatabase(db);
  assert.ok(statements.some(statement => statement.includes('CREATE TABLE app_preferences')));
  assert.ok(statements.some(statement => statement.includes('PRAGMA user_version = 3')));
});
