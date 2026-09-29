/* global __dirname */
// Run with: node --test scripts/check-query-hooks.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const query = require('@tanstack/react-query');

function load(file, dependencies) {
  const filename = path.resolve(__dirname, '..', file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    throw new Error(`Unexpected import ${name}`);
  } }, { filename });
  return exports;
}
const errors = load('src/lib/api/errors.ts', {});
const time = '2026-09-26T12:00:00Z';
const complete = { email: 'sam@example.com', preferredName: 'Sam', conversationStyle: 'warm_balanced', onboardingCompletedAt: time, profileVersion: 2 };
const conversation = { id: 'companion', createdAt: time, updatedAt: time };
const message = id => ({ id, role: 'assistant', content: id, createdAt: time, replyToMessageId: null, replyToMessage: null });
const page = (ids, cursor = null) => ({ conversation, messages: ids.map(message), nextCursor: cursor, hasMore: cursor !== null });
function setup(overrides = {}) {
  const calls = [];
  const client = new query.QueryClient({ defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  const profile = load('src/lib/queries/profile.ts', {
    '@tanstack/react-query': query, '@/lib/api/errors': errors,
    '@/lib/api/profile': {
      getMyProfile: async options => { calls.push('profile'); return overrides.getProfile ? overrides.getProfile(options) : complete; },
      updateMyProfile: async input => { calls.push('patch'); return overrides.update ? overrides.update(input) : { ...complete, ...input, profileVersion: 3 }; },
      completeMyOnboarding: async () => { calls.push('complete'); return complete; },
    },
  });
  const conversations = load('src/lib/queries/conversations.ts', {
    '@tanstack/react-query': query, '@/lib/api/errors': errors, '@/lib/queries/profile': profile,
    '@/lib/api/conversations': {
      putCompanionConversation: async () => { calls.push('put'); return overrides.put ? overrides.put() : { conversation, created: false }; },
      getCompanionMessages: async input => { calls.push(['messages', input.cursor]); return overrides.getMessages ? overrides.getMessages(input) : page(['greeting']); },
      sendChatMessage: async (input, options) => { calls.push(['send', input, options]); if (overrides.send) return overrides.send(input); return { conversationId: conversation.id }; },
    },
  });
  return { client, calls, ...profile, ...conversations };
}
function mutate(app, options, input) {
  return app.client.getMutationCache().build(app.client, options).execute(input);
}
test('history follows profile -> companion -> history and deduplicates initialization', async () => {
  const app = setup();
  const opts = app.companionMessagesQueryOptions(app.client, 'a');
  await Promise.all([app.client.fetchInfiniteQuery(opts), app.client.fetchQuery(app.companionQueryOptions(app.client, 'a'))]);
  assert.deepEqual(app.calls, ['profile', 'put', ['messages', undefined]]);
  app.client.clear();
});
test('incomplete onboarding blocks companion/history and completion unblocks it', async () => {
  const app = setup({ getProfile: () => ({ ...complete, onboardingCompletedAt: null }) });
  const opts = app.companionMessagesQueryOptions(app.client, 'a');
  await assert.rejects(app.client.fetchInfiniteQuery(opts), e => e.code === 'ONBOARDING_REQUIRED');
  assert.deepEqual(app.calls, ['profile']);
  await mutate(app, app.completeOnboardingMutationOptions(app.client, 'a'));
  await app.client.fetchInfiniteQuery(opts);
  assert.deepEqual(app.calls, ['profile', 'complete', 'put', ['messages', undefined]]);
  assert.equal(app.client.getQueryData(app.profileKeys.detail('a')).onboardingCompletedAt, time);
  app.client.clear();
});
test('signed-out queries stay disabled and manual execution cannot hit APIs', async () => {
  const app = setup();
  const opts = app.companionMessagesQueryOptions(app.client, undefined);
  assert.equal(opts.enabled, false);
  assert.equal(app.profileQueryOptions(undefined).enabled, false);
  await assert.rejects(app.client.fetchInfiniteQuery(opts), e => e.code === 'MISSING_SESSION');
  await assert.rejects(mutate(app, app.updateProfileMutationOptions(app.client, undefined), { preferredName: 'Sam' }), e => e.code === 'MISSING_SESSION');
  assert.deepEqual(app.calls, []);
  app.client.clear();
});
test('older-page cursor flows through real infinite-query observer', async () => {
  const app = setup({ getMessages: ({ cursor }) => cursor === 'older' ? page(['1', '2']) : page(['3', '4'], 'older') });
  const observer = new query.InfiniteQueryObserver(app.client, app.companionMessagesQueryOptions(app.client, 'a'));
  await observer.refetch();
  assert.equal(observer.getCurrentResult().hasNextPage, true);
  await observer.fetchNextPage();
  const result = observer.getCurrentResult();
  assert.equal(result.hasNextPage, false);
  assert.deepEqual(Array.from(app.flattenCompanionMessages(result.data).messages, x => x.id), ['1', '2', '3', '4']);
  assert.deepEqual(app.calls, ['profile', 'put', ['messages', undefined], ['messages', 'older']]);
  observer.destroy(); app.client.clear();
});
test('flattening deduplicates IDs without mutating pages or losing quotes', () => {
  const app = setup();
  const newer = page(['2', '3']);
  newer.messages[0].replyToMessage = { id: 'outside-page', role: 'assistant', content: 'quote' };
  const older = page(['1', '2']);
  const input = { pages: [newer, older], pageParams: [undefined, 'older'] };
  const result = app.flattenCompanionMessages(input);
  assert.deepEqual(Array.from(result.messages, x => x.id), ['1', '2', '3']);
  assert.equal(result.messages[1].replyToMessage.content, 'quote');
  assert.deepEqual(input.pages, [newer, older]);
  app.client.clear();
});
test('profile writes update only their account and never downgrade a newer version', async () => {
  const app = setup();
  app.client.setQueryData(app.profileKeys.detail('b'), { ...complete, preferredName: 'Other' });
  await mutate(app, app.updateProfileMutationOptions(app.client, 'a'), { preferredName: 'New' });
  assert.equal(app.client.getQueryData(app.profileKeys.detail('a')).preferredName, 'New');
  assert.equal(app.client.getQueryData(app.profileKeys.detail('b')).preferredName, 'Other');
  app.client.setQueryData(app.profileKeys.detail('a'), { ...complete, preferredName: 'Newest', profileVersion: 9 });
  await mutate(app, app.updateProfileMutationOptions(app.client, 'a'), { preferredName: 'Old' });
  assert.equal(app.client.getQueryData(app.profileKeys.detail('a')).preferredName, 'Newest');
  app.client.clear();
});
test('send leaves history stable for explicit optimistic reconciliation and reuses its request ID', async () => {
  const app = setup();
  for (const user of ['a', 'b']) app.client.setQueryData(app.conversationKeys.messages(user), { pages: [page(['greeting'])], pageParams: [undefined] });
  const input = { message: 'Hello', clientRequestId: 'same-id' };
  await mutate(app, app.sendChatMutationOptions(app.client, 'a'), input);
  assert.equal(app.client.getQueryState(app.conversationKeys.messages('a')).isInvalidated, false);
  assert.equal(app.client.getQueryState(app.conversationKeys.messages('b')).isInvalidated, false);
  const call = app.calls.find(x => Array.isArray(x) && x[0] === 'send');
  assert.equal(call[2].requestId, input.clientRequestId);
  assert.equal(call[1], input);
  app.client.clear();
});
test('completed send is appended without refetching or duplicating server IDs', () => {
  const app = setup();
  app.client.setQueryData(app.conversationKeys.messages('a'), { pages: [page(['greeting'])], pageParams: [undefined] });
  const request = { message: 'Hello', clientRequestId: 'request', replyToMessageId: 'greeting' };
  const replyTarget = { id: 'greeting', role: 'assistant', content: 'greeting' };
  const response = {
    conversationId: conversation.id, userMessageId: 'user', assistantMessageId: 'assistant',
    reply: 'Hi', responseId: null, userMessageCreatedAt: time, assistantMessageCreatedAt: time,
  };
  app.addCompletedSendToCache(app.client, 'a', request, replyTarget, response);
  app.addCompletedSendToCache(app.client, 'a', request, replyTarget, response);
  const cached = app.client.getQueryData(app.conversationKeys.messages('a'));
  assert.deepEqual(Array.from(cached.pages[0].messages, item => item.id), ['greeting', 'user', 'assistant']);
  assert.equal(cached.pages[0].messages[1].replyToMessage.content, 'greeting');
  assert.equal(app.calls.length, 0);
  app.client.clear();
});
test('failed writes do not auto-retry or replace confirmed profile data', async () => {
  const failure = new Error('offline');
  const app = setup({ update: () => { throw failure; } });
  app.client.setQueryData(app.profileKeys.detail('a'), complete);
  await assert.rejects(mutate(app, app.updateProfileMutationOptions(app.client, 'a'), { preferredName: 'New' }), failure);
  assert.deepEqual(app.calls, ['patch']);
  assert.equal(app.client.getQueryData(app.profileKeys.detail('a')).preferredName, 'Sam');
  app.client.clear();
});
test('account cache clearing aborts pending reads and prevents later companion calls', async () => {
  let resolve;
  let signal;
  const app = setup({ getProfile: options => { signal = options.signal; return new Promise(done => { resolve = done; }); } });
  const pending = app.client.fetchInfiniteQuery(app.companionMessagesQueryOptions(app.client, 'a'));
  const rejected = assert.rejects(pending);
  app.client.clear();
  assert.equal(signal.aborted, true);
  resolve(complete);
  await rejected;
  await new Promise(done => setImmediate(done));
  assert.deepEqual(app.calls, ['profile']);
  assert.equal(app.client.getQueryCache().getAll().length, 0);
});

test('profile writes share a serial scope so completion cannot overtake saving', async () => {
  let release;
  const app = setup({ update: () => new Promise(done => { release = () => done({ ...complete, profileVersion: 1 }); }) });
  const saved = mutate(app, app.updateProfileMutationOptions(app.client, 'a'), { preferredName: 'Sam' });
  const completed = mutate(app, app.completeOnboardingMutationOptions(app.client, 'a'));
  await new Promise(done => setImmediate(done));
  assert.deepEqual(app.calls, ['patch']);
  release();
  await Promise.all([saved, completed]);
  assert.deepEqual(app.calls, ['patch', 'complete']);
  assert.equal(app.client.getQueryData(app.profileKeys.detail('a')).profileVersion, 2);
  app.client.clear();
});
test('send failure is not automatically retried', async () => {
  const app = setup({ send: () => { throw new Error('busy'); } });
  await assert.rejects(mutate(app, app.sendChatMutationOptions(app.client, 'a'), { message: 'Hi', clientRequestId: 'id' }), /busy/);
  assert.equal(app.calls.filter(x => Array.isArray(x) && x[0] === 'send').length, 1);
  app.client.clear();
});

test('history works with the actual React Native AbortController polyfill', async () => {
  const original = global.AbortController;
  global.AbortController = require('abort-controller/dist/abort-controller').AbortController;
  const app = setup();
  try {
    const data = await app.client.fetchInfiniteQuery(app.companionMessagesQueryOptions(app.client, 'a'));
    assert.equal(data.pages[0].messages[0].id, 'greeting');
    assert.deepEqual(app.calls, ['profile', 'put', ['messages', undefined]]);
  } finally { app.client.clear(); global.AbortController = original; }
});


test('retry after failed initialization opens chat without repeating onboarding writes', async () => {
  let attempts = 0;
  const app = setup({ put: () => { if (++attempts === 1) throw new Error('offline'); return { conversation, created: false }; } });
  const options = app.companionMessagesQueryOptions(app.client, 'a');
  await assert.rejects(app.client.fetchInfiniteQuery(options), /offline/);
  const result = await app.client.fetchInfiniteQuery(options);
  assert.equal(result.pages[0].messages[0].id, 'greeting');
  assert.deepEqual(app.calls, ['profile', 'put', 'put', ['messages', undefined]]);
  app.client.clear();
});

test('history retry after a lost response reuses initialized companion', async () => {
  let attempts = 0;
  const app = setup({ getMessages: () => { if (++attempts === 1) throw new Error('offline'); return page(['greeting']); } });
  const options = app.companionMessagesQueryOptions(app.client, 'a');
  await assert.rejects(app.client.fetchInfiniteQuery(options), /offline/);
  await app.client.fetchInfiniteQuery(options);
  assert.equal(app.calls.filter(call => call === 'put').length, 1);
  assert.ok(!app.calls.includes('patch') && !app.calls.includes('complete'));
  app.client.clear();
});

test('a failed background refresh retains loaded messages for the recovery banner', async () => {
  let fail = false;
  const app = setup({ getMessages: () => { if (fail) throw new Error('offline'); return page(['greeting']); } });
  const observer = new query.InfiniteQueryObserver(app.client, app.companionMessagesQueryOptions(app.client, 'a'));
  await observer.refetch();
  fail = true;
  await observer.refetch();
  assert.equal(observer.getCurrentResult().isError, true);
  assert.equal(observer.getCurrentResult().data.pages[0].messages[0].id, 'greeting');
  observer.destroy();
  app.client.clear();
});
