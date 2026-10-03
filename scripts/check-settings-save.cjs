/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const exportsObject = {};
const source = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '..', 'src/features/settings/save-controller.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
vm.runInNewContext(source, { exports: exportsObject });
const { SettingsSaveController } = exportsObject;

function loadSettingsUI(file, native = {}, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText;
  const mocks = {
    'react/jsx-runtime': require('react/jsx-runtime'),
    react: { useMemo: fn => fn(), useCallback: fn => fn, useState: value => [value, () => {}] },
    'react-native': { View: 'view', Text: 'text', Pressable: 'pressable', StyleSheet: { create: value => value }, ...native },
    '@/design-system/theme': { useTheme: () => ({ theme: { colors: {}, spacing: {}, sizing: {}, typography: {}, radii: {} } }) },
    ...dependencies,
  };
  vm.runInNewContext(source, { exports, require: name => {
    assert.ok(Object.hasOwn(mocks, name), name);
    return mocks[name];
  } });
  return exports;
}

for (const disabled of [false, true]) {
  test(`shared Settings back handler respects disabled=${disabled} and removes its listener`, () => {
    let back;
    let cleanup;
    let removed = false;
    let navigations = 0;
    const { SettingsScreen } = loadSettingsUI('src/features/settings/settings-screen.tsx', {
      BackHandler: { addEventListener: (event, handler) => {
        assert.equal(event, 'hardwareBackPress');
        back = handler;
        return { remove: () => { removed = true; } };
      } },
      ScrollView: 'scroll',
    }, {
      'expo-router': { useFocusEffect: effect => { cleanup = effect(); } },
      'react-native-safe-area-context': { SafeAreaView: 'safe-area' },
      'react-native-svg': { default: 'svg', Path: 'path' },
      '@/design-system/components': { IconButton: 'button' },
      '@/features/auth/use-screen-reader-focus': { useScreenReaderFocus: () => ({ current: null }) },
    });
    SettingsScreen({ title: 'Settings', backDisabled: disabled, onBack: () => { navigations++; } });
    assert.equal(back(), true);
    assert.equal(navigations, disabled ? 0 : 1);
    cleanup();
    assert.equal(removed, true);
  });
}

test('shared radio row retains selection, disabled state, hints and descriptions', () => {
  const { SettingsRadioRow } = loadSettingsUI('src/features/settings/settings-radio-row.tsx');
  const onPress = () => {};
  const row = SettingsRadioRow({ label: 'System', description: 'Match your phone', selected: true, disabled: true, onPress });
  assert.equal(row.props.accessibilityRole, 'radio');
  assert.equal(row.props.accessibilityState.checked, true);
  assert.equal(row.props.disabled, true);
  assert.equal(row.props.accessibilityHint, 'Match your phone');
  assert.equal(row.props.onPress, onPress);
  assert.equal(row.props.children[1].props.children[1].props.children, 'Match your phone');
  const styleRow = SettingsRadioRow({ label: 'Warm', accessibilityHint: 'Sample reply', selected: false, disabled: false, onPress });
  assert.equal(styleRow.props.accessibilityHint, 'Sample reply');
  assert.equal(styleRow.props.children[1].props.children[1], undefined);
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

function timeoutHarness() {
  const exports = {};
  let expire;
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', 'src/lib/api/with-request-timeout.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  vm.runInNewContext(source, {
    exports, AbortController,
    setTimeout: (fn, delay) => { assert.equal(delay, 20_000); expire = fn; return 1; },
    clearTimeout: () => {},
  });
  return { ...exports, expire: () => expire() };
}

test('a stalled sign-out releases the settings lock and publishes recovery', async () => {
  const controller = new SettingsSaveController();
  const timeout = timeoutHarness();
  const request = deferred();
  let failures = 0;
  let successes = 0;
  const pending = controller.run(
    () => timeout.withRequestTimeout(() => request.promise),
    () => { successes++; },
    () => { failures++; },
  );
  timeout.expire();
  await pending;
  assert.equal(controller.isBusy(), false);
  assert.equal(failures, 1);
  request.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(successes, 0);
});

test('late reauthentication after timeout cannot advance to account deletion', async () => {
  const timeout = timeoutHarness();
  const request = deferred();
  let deletions = 0;
  const flow = (async () => {
    await timeout.withRequestTimeout(() => request.promise);
    deletions++;
  })();
  const rejected = assert.rejects(flow, /timed out/);
  timeout.expire();
  await rejected;
  request.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(deletions, 0);
});

test('settings saves block duplicate taps and navigate once after success', async () => {
  const controller = new SettingsSaveController();
  const request = deferred();
  let saves = 0;
  let closes = 0;
  const save = () => {
    saves++;
    return request.promise;
  };

  const first = controller.run(save, () => { closes++; });
  const duplicate = controller.run(save, () => { closes++; });
  assert.equal(saves, 1);
  request.resolve();
  await Promise.all([first, duplicate]);
  assert.equal(closes, 1);
});

test('a failed settings save can be retried', async () => {
  const controller = new SettingsSaveController();
  let attempts = 0;
  await controller.run(async () => {
    attempts++;
    throw new Error('offline');
  }, () => {});
  await controller.run(async () => { attempts++; }, () => {});
  assert.equal(attempts, 2);
});

test('an abandoned settings save cannot navigate after completion', async () => {
  const controller = new SettingsSaveController();
  const request = deferred();
  let closes = 0;
  const pending = controller.run(() => request.promise, () => { closes++; });
  controller.cancel();
  request.resolve();
  await pending;
  assert.equal(closes, 0);
});

test('settings operations publish a retryable error once', async () => {
  const controller = new SettingsSaveController();
  let successes = 0;
  let failures = 0;
  await controller.run(
    async () => { throw new Error('offline'); },
    () => { successes++; },
    error => { assert.equal(error.message, 'offline'); failures++; },
  );
  assert.equal(successes, 0);
  assert.equal(failures, 1);
});

test('abandoned settings operations suppress late errors', async () => {
  const controller = new SettingsSaveController();
  const request = deferred();
  let failures = 0;
  const pending = controller.run(
    () => request.promise,
    () => {},
    () => { failures++; },
  );
  controller.cancel();
  request.reject(new Error('offline'));
  await pending;
  assert.equal(failures, 0);
});
