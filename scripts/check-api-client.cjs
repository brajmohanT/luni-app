/* global __dirname */
// Run with: node --test scripts/check-api-client.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { z } = require('zod');

const sentId = '11111111-1111-4111-8111-111111111111';
const serverId = '22222222-2222-4222-8222-222222222222';
function load(relativePath, dependencies, globals = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require(name) {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error(`Unexpected import: ${name}`);
    },
    ...globals,
  }, { filename });
  return exports;
}
const types = load('src/lib/api/types.ts', { zod: { z } });
const errors = load('src/lib/api/errors.ts', {});
function setup(respond, session = { data: { session: { access_token: 'test-token' } }, error: null }) {
  const calls = [];
  let generated = 0;
  const { apiRequest } = load('src/lib/api/client.ts', {
    'expo-constants': { nativeApplicationVersion: '1.0.0', nativeBuildVersion: '42' },
    'expo-crypto': { randomUUID: () => { generated++; return sentId; } },
    'react-native': { Platform: { OS: 'android', Version: 36 } },
    '@/lib/api/errors': errors,
    '@/lib/api/types': types,
    '@/lib/auth/supabase': { supabase: { auth: { getSession: async () => session } } },
    '@/lib/config/env': { env: { apiUrl: 'https://example.test' } },
  }, { __DEV__: false, fetch: async (...args) => { calls.push(args); return respond(...args); } });
  return { apiRequest, calls, generated: () => generated };
}
const options = { path: '/me', responseSchema: z.object({ ok: z.boolean() }) };
const ok = () => Response.json({ ok: true });

for (const method of ['GET', 'POST', 'PUT']) {
  test(`${method} supports bodyless requests`, async () => {
    const app = setup(ok);
    const signal = new AbortController().signal;
    assert.deepEqual(await app.apiRequest({ ...options, method, signal }), { ok: true });
    const [url, request] = app.calls[0];
    assert.equal(url, 'https://example.test/me');
    assert.equal(request.method, method);
    assert.equal(request.body, undefined);
    assert.equal(request.headers['Content-Type'], undefined);
    assert.equal(request.headers.Authorization, 'Bearer test-token');
    assert.equal(request.headers['X-App-Version'], '1.0.0');
    assert.equal(request.headers['X-App-Build'], '42');
    assert.equal(request.headers['X-Platform'], 'android');
    assert.equal(request.headers['X-Platform-Version'], '36');
    assert.equal(request.headers['X-Request-Id'], sentId);
    assert.equal(request.signal, signal);
    assert.equal(app.generated(), 1);
  });
}
test('PATCH serializes JSON and preserves an explicit ID across retries', async () => {
  const app = setup(ok);
  const input = { ...options, path: 'me', method: 'PATCH', body: { preferredName: 'Sam' }, requestId: serverId };
  await app.apiRequest(input);
  await app.apiRequest(input);
  for (const [url, request] of app.calls) {
    assert.equal(url, 'https://example.test/me');
    assert.equal(request.method, 'PATCH');
    assert.equal(request.body, '{"preferredName":"Sam"}');
    assert.equal(request.headers['Content-Type'], 'application/json');
    assert.equal(request.headers['X-Request-Id'], serverId);
  }
  assert.equal(app.generated(), 0);
});
for (const [header, expected] of [['3', 3], [null, null], ['0', null], ['-1', null], ['1.5', null], ['3junk', null], ['9007199254740992', null]]) {
  test(`Retry-After ${header} yields ${expected}`, async () => {
    const app = setup(() => Response.json({ code: 'CONVERSATION_BUSY', message: 'Busy' }, {
      status: 409, headers: { 'X-Request-Id': serverId, ...(header === null ? {} : { 'Retry-After': header }) },
    }));
    await assert.rejects(app.apiRequest(options), error => {
      assert.ok(error instanceof errors.ApiClientError);
      assert.equal(error.code, 'CONVERSATION_BUSY');
      assert.equal(error.status, 409);
      assert.equal(error.requestId, serverId);
      assert.equal(error.retryAfterSeconds, expected);
      return true;
    });
    assert.equal(app.calls.length, 1); // The client does not auto-retry writes.
  });
}
test('network errors retain the outgoing ID and cause', async () => {
  const cause = new Error('offline');
  const app = setup(() => { throw cause; });
  await assert.rejects(app.apiRequest(options), error => {
    assert.equal(error.code, 'NETWORK_ERROR');
    assert.equal(error.requestId, sentId);
    assert.equal(error.retryAfterSeconds, null);
    assert.equal(error.cause, cause);
    return true;
  });
});
for (const [body, status, code] of [
  ['not json', 503, 'INVALID_RESPONSE'],
  ['{}', 409, 'INVALID_RESPONSE'],
  ['{"code":"CHAT_REQUEST_IN_PROGRESS","message":"Wait"}', 409, 'CHAT_REQUEST_IN_PROGRESS'],
  ['not json', 200, 'INVALID_RESPONSE'],
  ['{}', 200, 'INVALID_RESPONSE'],
]) {
  test(`response ${status} ${body} keeps fallback ID and retry metadata`, async () => {
    const app = setup(() => new Response(body, { status, headers: { 'Retry-After': '3' } }));
    await assert.rejects(app.apiRequest(options), error => {
      assert.equal(error.code, code);
      assert.equal(error.requestId, sentId);
      assert.equal(error.retryAfterSeconds, 3);
      return true;
    });
  });
}
test('missing session prevents the request', async () => {
  const app = setup(ok, { data: { session: null }, error: null });
  await assert.rejects(app.apiRequest(options), error => error.code === 'MISSING_SESSION');
  assert.equal(app.calls.length, 0);
});
test('validation error details survive parsing', async () => {
  const details = [{ path: 'preferredName', message: 'Required' }];
  const app = setup(() => Response.json({ code: 'VALIDATION_ERROR', message: 'Invalid', details }, { status: 400 }));
  await assert.rejects(app.apiRequest(options), error => {
    assert.deepEqual(error.details, details);
    return true;
  });
});

const firstProfile = {
  email: 'sam@example.com', preferredName: null, conversationStyle: 'warm_balanced',
  onboardingCompletedAt: null, profileVersion: 0,
};
function setupProfiles(respond) {
  const app = setup(respond);
  const profiles = load('src/lib/api/profile.ts', {
    '@/lib/api/client': { apiRequest: app.apiRequest },
    '@/lib/api/types': types,
  });
  return { ...app, ...profiles };
}
test('profile GET returns first-account defaults', async () => {
  const app = setupProfiles(() => Response.json(firstProfile));
  assert.deepEqual(await app.getMyProfile(), firstProfile);
  assert.equal(app.calls[0][0], 'https://example.test/me');
  assert.equal(app.calls[0][1].method, 'GET');
  assert.equal(app.calls[0][1].body, undefined);
});
for (const input of [{ preferredName: ' Sam ' }, { conversationStyle: 'direct_thoughtful' }, { preferredName: 'Sam', conversationStyle: 'gentle_reassuring' }]) {
  test(`profile PATCH sends only supplied fields: ${JSON.stringify(input)}`, async () => {
    const saved = { ...firstProfile, preferredName: 'Sam', ...input, profileVersion: 1 };
    const app = setupProfiles(() => Response.json(saved));
    assert.deepEqual(await app.updateMyProfile(input), saved);
    const [url, request] = app.calls[0];
    assert.equal(url, 'https://example.test/me');
    assert.equal(request.method, 'PATCH');
    assert.deepEqual(JSON.parse(request.body), { ...input, ...(input.preferredName ? { preferredName: input.preferredName.trim() } : {}) });
  });
}
test('invalid profile updates never reach the network', () => {
  const app = setupProfiles(ok);
  for (const input of [{}, { preferredName: ' ' }, { conversationStyle: 'unknown' }, { preferredName: 'Sam', profileVersion: 3 }]) {
    assert.throws(() => app.updateMyProfile(input), error => error instanceof z.ZodError);
  }
  assert.equal(app.calls.length, 0);
});
test('completion is bodyless and returns the server completion timestamp', async () => {
  const saved = { ...firstProfile, preferredName: 'Sam', onboardingCompletedAt: '2026-09-26T12:00:00Z', profileVersion: 2 };
  const app = setupProfiles(() => Response.json(saved));
  assert.deepEqual(await app.completeMyOnboarding(), saved);
  const [url, request] = app.calls[0];
  assert.equal(url, 'https://example.test/me/onboarding/complete');
  assert.equal(request.method, 'POST');
  assert.equal(request.body, undefined);
  assert.equal(request.headers['Content-Type'], undefined);
});
test('all profile functions forward request IDs and cancellation signals', async () => {
  const app = setupProfiles(() => Response.json(firstProfile));
  const signal = new AbortController().signal;
  const opts = { requestId: serverId, signal };
  await app.getMyProfile(opts);
  await app.updateMyProfile({ preferredName: 'Sam' }, opts);
  await app.completeMyOnboarding(opts);
  for (const [, request] of app.calls) {
    assert.equal(request.headers['X-Request-Id'], serverId);
    assert.equal(request.signal, signal);
  }
  assert.equal(app.generated(), 0);
});
test('all profile functions reject malformed server profiles', async () => {
  const app = setupProfiles(() => Response.json({ email: 'sam@example.com' }));
  for (const run of [() => app.getMyProfile(), () => app.updateMyProfile({ preferredName: 'Sam' }), () => app.completeMyOnboarding()]) {
    await assert.rejects(run(), error => error.code === 'INVALID_RESPONSE');
  }
});
test('completion preserves incomplete-profile conflict metadata', async () => {
  const app = setupProfiles(() => Response.json({ code: 'ONBOARDING_PROFILE_INCOMPLETE', message: 'Save a name first.' }, {
    status: 409, headers: { 'X-Request-Id': serverId },
  }));
  await assert.rejects(app.completeMyOnboarding(), error => {
    assert.equal(error.code, 'ONBOARDING_PROFILE_INCOMPLETE');
    assert.equal(error.status, 409);
    assert.equal(error.requestId, serverId);
    return true;
  });
});

const conversation = { id: sentId, createdAt: '2026-09-26T12:00:00Z', updatedAt: '2026-09-26T12:00:00Z' };
const history = { conversation, messages: [], nextCursor: null, hasMore: false };
const chatResult = { reply: 'Hello', responseId: null, conversationId: sentId, userMessageId: sentId, assistantMessageId: serverId, userMessageCreatedAt: conversation.createdAt, assistantMessageCreatedAt: conversation.createdAt };
function setupConversations(respond) {
  const app = setup(respond);
  return { ...app, ...load('src/lib/api/conversations.ts', {
    '@/lib/api/client': { apiRequest: app.apiRequest }, '@/lib/api/types': types,
  }) };
}
test('companion PUT is bodyless and preserves created status', async () => {
  for (const created of [true, false]) {
    const app = setupConversations(() => Response.json({ conversation, created }));
    assert.deepEqual(await app.putCompanionConversation(), { conversation, created });
    const [url, request] = app.calls[0];
    assert.equal(url, 'https://example.test/conversations/companion');
    assert.equal(request.method, 'PUT');
    assert.equal(request.body, undefined);
    assert.equal(request.headers['Content-Type'], undefined);
  }
});
test('history GET omits unspecified pagination parameters', async () => {
  const app = setupConversations(() => Response.json(history));
  assert.deepEqual(await app.getCompanionMessages(), history);
  assert.equal(app.calls[0][0], 'https://example.test/conversations/companion/messages');
  assert.equal(app.calls[0][1].method, 'GET');
});
test('history preserves opaque cursors and quoted server messages', async () => {
  const cursor = 'a+/=?& #';
  const quote = { id: serverId, role: 'assistant', content: 'Saved greeting' };
  const page = { ...history, messages: [{ id: sentId, role: 'user', content: 'Hi', replyToMessageId: serverId, replyToMessage: quote, createdAt: conversation.createdAt }], nextCursor: cursor, hasMore: true };
  const app = setupConversations(() => Response.json(page));
  assert.deepEqual(await app.getCompanionMessages({ limit: 25, cursor }), page);
  const url = new URL(app.calls[0][0]);
  assert.equal(url.searchParams.get('limit'), '25');
  assert.equal(url.searchParams.get('cursor'), cursor);
  assert.equal(app.calls[0][1].body, undefined);
});
test('invalid history query is rejected before fetching', () => {
  const app = setupConversations(ok);
  for (const query of [{ limit: 0 }, { limit: 101 }, { cursor: '' }, { conversationId: sentId }]) {
    assert.throws(() => app.getCompanionMessages(query), error => error instanceof z.ZodError);
  }
  assert.equal(app.calls.length, 0);
});
test('chat sends v2 payload and keeps request identity on replay', async () => {
  const app = setupConversations(() => Response.json(chatResult));
  const signal = new AbortController().signal;
  const input = { message: ' Hi ', clientRequestId: sentId, replyToMessageId: serverId };
  for (let attempt = 0; attempt < 2; attempt++) {
    assert.deepEqual(await app.sendChatMessage(input, { requestId: serverId, signal }), chatResult);
  }
  for (const [url, request] of app.calls) {
    assert.equal(url, 'https://example.test/chat');
    assert.equal(request.method, 'POST');
    assert.deepEqual(JSON.parse(request.body), { ...input, message: 'Hi' });
    assert.equal(request.headers['X-Request-Id'], serverId);
    assert.equal(request.signal, signal);
  }
});
test('chat rejects legacy conversation IDs before fetching', () => {
  const app = setupConversations(ok);
  assert.throws(() => app.sendChatMessage({ message: 'Hi', clientRequestId: sentId, conversationId: sentId }), error => error instanceof z.ZodError);
  assert.equal(app.calls.length, 0);
});
test('companion and history forward caller options', async () => {
  const app = setupConversations(url => Response.json(url.endsWith('/messages') ? history : { conversation, created: false }));
  const signal = new AbortController().signal;
  const opts = { requestId: serverId, signal };
  await app.putCompanionConversation(opts);
  await app.getCompanionMessages({}, opts);
  for (const [, request] of app.calls) {
    assert.equal(request.headers['X-Request-Id'], serverId);
    assert.equal(request.signal, signal);
  }
});
test('conversation functions validate responses and preserve API errors', async () => {
  for (const result of ['invalid', 'error']) {
    const app = setupConversations(() => result === 'invalid' ? Response.json({}) : Response.json({ code: 'ONBOARDING_REQUIRED', message: 'Complete onboarding.' }, { status: 409 }));
    for (const run of [() => app.putCompanionConversation(), () => app.getCompanionMessages(), () => app.sendChatMessage({ message: 'Hi', clientRequestId: sentId })]) {
      await assert.rejects(run(), error => error.code === (result === 'invalid' ? 'INVALID_RESPONSE' : 'ONBOARDING_REQUIRED'));
    }
  }
});

const reportReceipt = { id: serverId, status: 'open', createdAt: conversation.createdAt };
function setupMessageReports(respond, session) {
  const app = session ? setup(respond, session) : setup(respond);
  const reports = load('src/lib/api/message-reports.ts', {
    zod: { z },
    '@/lib/api/client': { apiRequest: app.apiRequest },
    '@/lib/api/types': types,
  });
  return { ...app, ...reports };
}
test('message report sends the validated payload with one request identity', async () => {
  const app = setupMessageReports(
    () => Response.json(reportReceipt, { status: 201 }),
    { data: { session: { access_token: 'test-token', user: { id: 'account' } } }, error: null },
  );
  const signal = new AbortController().signal;
  const input = { reason: 'privacy', details: ' Personal information ', clientRequestId: sentId };
  assert.deepEqual(
    await app.reportAssistantMessage(serverId, input, { expectedUserId: 'account', signal }),
    reportReceipt,
  );
  const [url, request] = app.calls[0];
  assert.equal(url, `https://example.test/messages/${serverId}/reports`);
  assert.equal(request.method, 'POST');
  assert.deepEqual(JSON.parse(request.body), { ...input, details: 'Personal information' });
  assert.equal(request.headers['X-Request-Id'], sentId);
  assert.equal(request.signal, signal);
});
test('message report rejects invalid IDs and payloads before fetching', () => {
  const app = setupMessageReports(() => Response.json(reportReceipt));
  const valid = { reason: 'unsafe_content', clientRequestId: sentId };
  assert.throws(() => app.reportAssistantMessage('not-a-uuid', valid), error => error instanceof z.ZodError);
  assert.throws(() => app.reportAssistantMessage(serverId, { ...valid, reason: 'unknown' }), error => error instanceof z.ZodError);
  assert.throws(() => app.reportAssistantMessage(serverId, { ...valid, details: '   ' }), error => error instanceof z.ZodError);
  assert.equal(app.calls.length, 0);
});
test('message report accepts an idempotent receipt replay and preserves report errors', async () => {
  const replay = setupMessageReports(() => Response.json(reportReceipt, { status: 200 }));
  assert.deepEqual(await replay.reportAssistantMessage(serverId, {
    reason: 'other', clientRequestId: sentId,
  }), reportReceipt);

  const failure = setupMessageReports(() => Response.json({
    code: 'REPORT_MESSAGE_NOT_FOUND', message: 'Message not found.',
  }, { status: 404 }));
  await assert.rejects(failure.reportAssistantMessage(serverId, {
    reason: 'other', clientRequestId: sentId,
  }), error => error.code === 'REPORT_MESSAGE_NOT_FOUND');
});

test('account-bound request refuses another account token before fetching', async () => {
  const app = setup(ok, { data: { session: { access_token: 'other-token', user: { id: 'other' } } }, error: null });
  await assert.rejects(app.apiRequest({ ...options, expectedUserId: 'original' }), error => error.code === 'MISSING_SESSION');
  assert.equal(app.calls.length, 0);
});
test('account-bound request accepts the matching session', async () => {
  const app = setup(ok, { data: { session: { access_token: 'test-token', user: { id: 'original' } } }, error: null });
  await app.apiRequest({ ...options, expectedUserId: 'original' });
  assert.equal(app.calls.length, 1);
});
