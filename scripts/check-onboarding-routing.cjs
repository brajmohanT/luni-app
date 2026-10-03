/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, AbortController, setTimeout, clearTimeout, require: name => {
    assert.ok(Object.hasOwn(dependencies, name), name);
    return dependencies[name];
  } });
  return exports;
}
const routes = load('src/features/auth/routes.ts');
const { onboardingRedirect } = load('src/features/auth/onboarding-route.ts', { '@/features/auth/routes': routes });
const profile = { preferredName: 'Sam', onboardingCompletedAt: null };
const destinations = ['/', '/chat/new', '/conversations/old-id', '/onboarding/name', '/onboarding/style'];
test('missing name guards every protected direct link', () => {
  for (const route of destinations) {
    assert.equal(onboardingRedirect({ ...profile, preferredName: null }, route), route === '/onboarding/name' ? null : routes.authRoutes.preferredName);
  }
});
test('saved name resumes style and permits name editing', () => {
  for (const route of destinations) {
    assert.equal(onboardingRedirect(profile, route), route.startsWith('/onboarding/') ? null : routes.authRoutes.conversationStyle);
  }
});
test('completed profiles open chat and cannot reopen onboarding or legacy routes', () => {
  for (const route of destinations) {
    assert.equal(onboardingRedirect({ ...profile, onboardingCompletedAt: '2026-09-28T00:00:00Z' }, route), route === '/' ? null : routes.authRoutes.authenticated);
  }
});

const React = require('react');
const runtime = require('react/jsx-runtime');
const Stack = Object.assign(() => null, { Screen: () => null, Protected: () => null });
const { AppStack } = load('src/features/auth/app-stack.tsx', { 'expo-router': { Stack }, 'react/jsx-runtime': runtime });
function available(node) {
  if (!node) return [];
  if (node.type === Stack.Screen) return [node.props.name];
  if (node.type === Stack.Protected && !node.props.guard) return [];
  return React.Children.toArray(node.props.children).flatMap(available);
}
test('completion removes onboarding and legacy routes from the available stack', () => {
  const before = available(AppStack({ profile }));
  assert.deepEqual(before, ['index', 'onboarding/name', 'onboarding/style']);
  const after = available(AppStack({ profile: { ...profile, onboardingCompletedAt: 'done' } }));
  assert.deepEqual(after, [
    'index',
    'settings/index',
    'settings/profile',
    'settings/style',
    'settings/appearance',
    'settings/account',
    'settings/delete-account',
  ]);
});
test('style is unavailable until a name exists; name editing remains available afterward', () => {
  assert.deepEqual(available(AppStack({ profile: { ...profile, preferredName: null } })), ['index', 'onboarding/name']);
  assert.ok(available(AppStack({ profile })).includes('onboarding/name'));
});
const errors = load('src/lib/api/errors.ts');
const { entryFailure } = load('src/features/auth/entry-failure.ts', { '@/lib/api/errors': errors });
const error = code => new errors.ApiClientError('server error', { code, status: 401, requestId: 'request-id' });
test('expired sessions require password sign-in; offline errors retain retry', () => {
  for (const code of ['MISSING_SESSION', 'MISSING_ACCESS_TOKEN', 'INVALID_ACCESS_TOKEN']) {
    assert.equal(entryFailure(error(code), 'chat').action, 'sign-in');
  }
  assert.equal(entryFailure(error('NETWORK_ERROR'), 'chat').action, 'retry');
});
test('verification, deletion, and onboarding conflicts receive their own recovery actions', () => {
  assert.equal(entryFailure(error('EMAIL_NOT_CONFIRMED'), 'profile').action, 'verify');
  assert.equal(entryFailure(error('ACCOUNT_DELETION_IN_PROGRESS'), 'profile').action, 'sign-out');
  assert.equal(entryFailure(error('ONBOARDING_REQUIRED'), 'chat').action, 'profile');
  assert.equal(entryFailure(error('ONBOARDING_PROFILE_INCOMPLETE'), 'chat').action, 'profile');
});

function recoveryHarness(signIn, retry, code = 'INVALID_ACCESS_TOKEN', signOut = async () => {}, cleanup = async () => {}) {
  const state = [];
  const refs = [];
  let stateIndex = 0;
  let refIndex = 0;
  const cleanups = [];
  const { EntryRecovery } = load('src/features/auth/entry-recovery.tsx', {
    'react/jsx-runtime': runtime,
    react: {
      useState: initial => { const index = stateIndex++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = value; }]; },
      useRef: initial => { const index = refIndex++; return refs[index] ??= { current: initial }; },
      useEffect: effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); },
    },
    'react-native': { Text: 'text', View: 'view' },
    'expo-sqlite': { useSQLiteContext: () => ({}) },
    '@/lib/database/chat-persistence': { clearAccountChatState: cleanup },
    '@/lib/api/with-request-timeout': load('src/lib/api/with-request-timeout.ts'),
    '@/design-system/components': { Button: 'button', TextField: 'input' },
    '@/design-system/theme': { useTheme: () => ({ theme: { colors: {}, typography: {}, spacing: {} } }) },
    '@/features/auth/entry-failure': { entryFailure },
    '@/features/profile/profile-screen': { ProfileScreen: 'screen' },
    '@/lib/api/errors': errors,
    '@/providers/auth-provider': { useAuth: () => ({ session: { user: { id: 'account', email: 'sam@example.com' } }, signInWithPassword: signIn, signOut }) },
  });
  function find(node, type) {
    if (!node) return undefined;
    if (node.type === type) return node;
    return React.Children.toArray(node.props?.children).map(child => find(child, type)).find(Boolean);
  }
  function render() {
    stateIndex = 0; refIndex = 0;
    return EntryRecovery({ error: error(code), target: 'chat', onRetry: retry });
  }
  return {
    enterPassword(value) { find(render(), 'input').props.onChangeText(value); },
    submit() { find(render(), 'button').props.onPress(); },
    unmount() { cleanups.forEach(fn => fn()); },
  };
}
test('password recovery signs in to the current account once before retrying', async () => {
  const calls = [];
  let finish;
  const harness = recoveryHarness(credentials => { calls.push(credentials); return new Promise(resolve => { finish = resolve; }); }, async () => { calls.push('retry'); });
  harness.enterPassword('secret');
  harness.submit(); harness.submit();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].email, 'sam@example.com');
  assert.equal(calls[0].password, 'secret');
  finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls[1], 'retry');
});
test('failed password recovery never retries the protected query', async () => {
  let retries = 0;
  const harness = recoveryHarness(async () => { throw new Error('invalid password'); }, async () => { retries++; });
  harness.enterPassword('wrong'); harness.submit();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(retries, 0);
});
test('abandoned password recovery cannot retry for a different account', async () => {
  let finish;
  let retries = 0;
  const harness = recoveryHarness(() => new Promise(resolve => { finish = resolve; }), async () => { retries++; });
  harness.enterPassword('secret'); harness.submit(); harness.unmount();
  finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(retries, 0);
});

test('an account being deleted clears local data before sign-out without retrying protected data', async () => {
  const calls = [];
  let signOuts = 0;
  let retries = 0;
  const harness = recoveryHarness(async () => {}, async () => { retries++; },
    'ACCOUNT_DELETION_IN_PROGRESS', async () => { calls.push('sign-out'); signOuts++; },
    async (_db, userId) => { calls.push('cleanup'); assert.equal(userId, 'account'); });
  harness.submit();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(signOuts, 1);
  assert.equal(retries, 0);
  assert.deepEqual(calls, ['cleanup', 'sign-out']);
});

test('deletion recovery retries failed local cleanup before signing out', async () => {
  let cleanups = 0;
  let signOuts = 0;
  const harness = recoveryHarness(async () => {}, async () => {},
    'ACCOUNT_DELETION_IN_PROGRESS', async () => { signOuts++; },
    async () => { if (++cleanups === 1) throw new Error('disk error'); });
  harness.submit();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(signOuts, 0);
  harness.submit();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(cleanups, 2);
  assert.equal(signOuts, 1);
});
