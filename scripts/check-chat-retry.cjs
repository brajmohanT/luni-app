/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { z } = require('zod');
function load(file, deps) {
  const filename = path.resolve(__dirname, '..', file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => {
    if (Object.hasOwn(deps, name)) return deps[name];
    throw new Error(`Unexpected import ${name}`);
  } }, { filename });
  return exports;
}
const errors = load('src/lib/api/errors.ts', {});
const types = load('src/lib/api/types.ts', { zod: { z } });
const { ChatSendController, classifySendFailure } = load('src/features/chat/send-controller.ts', {
  '@/lib/api/errors': errors, '@/lib/api/types': types,
});
const id = '11111111-1111-4111-8111-111111111111';
const quoteId = '22222222-2222-4222-8222-222222222222';
const response = { conversationId: id, userMessageId: id, assistantMessageId: quoteId, reply: 'Hi', responseId: null, userMessageCreatedAt: '2026-09-26T12:00:00Z', assistantMessageCreatedAt: '2026-09-26T12:00:01Z' };
const failure = (code, status = null, retryAfterSeconds = null) => new errors.ApiClientError('failed', { code, status, requestId: id, retryAfterSeconds });
function setup() {
  let now = 1000;
  let ids = 0;
  const controller = new ChatSendController(() => `${String(++ids).padStart(8, '0')}-1111-4111-8111-111111111111`, () => now);
  controller.updateDraft(' Hello ');
  return { controller, advance: ms => { now += ms; controller.tick(); }, ids: () => ids };
}
test('lost response retries the exact frozen text, quote and request ID', async () => {
  const { controller, ids } = setup();
  controller.selectReply({ id: quoteId, role: 'assistant', content: 'Earlier message' });
  const calls = [];
  await controller.start(async request => { calls.push(request); throw failure('NETWORK_ERROR'); });
  const original = controller.getSnapshot().pendingRequest;
  assert.ok(Object.isFrozen(original));
  assert.equal(original.message, 'Hello');
  assert.equal(original.replyToMessageId, quoteId);
  controller.updateDraft('Changed'); controller.selectReply(null);
  assert.equal(controller.getSnapshot().draft, ' Hello ');
  assert.equal(await controller.retry(async request => { calls.push(request); return response; }), response);
  assert.equal(calls[0], calls[1]);
  assert.equal(ids(), 1);
  assert.equal(controller.getSnapshot().pendingRequest, null);
  assert.equal(controller.getSnapshot().draft, '');
  assert.equal(controller.getSnapshot().replyTarget, null);
});
test('repeated send and retry taps never overlap', async () => {
  const { controller } = setup();
  let reject;
  let calls = 0;
  const pending = controller.start(() => { calls++; return new Promise((resolve, fail) => { reject = fail; }); });
  await controller.start(async () => { calls++; return response; });
  await controller.retry(async () => { calls++; return response; });
  assert.equal(calls, 1);
  reject(failure('NETWORK_ERROR')); await pending;
  let resolve;
  const retry = controller.retry(() => { calls++; return new Promise(done => { resolve = done; }); });
  await controller.retry(async () => { calls++; return response; });
  assert.equal(calls, 2);
  resolve(response); await retry;
});
test('Retry-After blocks early retries and uses elapsed time after backgrounding', async () => {
  const { controller, advance } = setup();
  await controller.start(async () => { throw failure('CONVERSATION_BUSY', 409, 5); });
  let calls = 0;
  const send = async () => { calls++; return response; };
  await controller.retry(send); advance(4999); await controller.retry(send);
  assert.equal(calls, 0);
  advance(60001); await controller.retry(send);
  assert.equal(calls, 1);
});
test('editing keeps cooldown and creates a new ID only on explicit new send', async () => {
  const { controller, advance } = setup();
  await controller.start(async () => { throw failure('CHAT_REQUEST_IN_PROGRESS', 409, 3); });
  const firstId = controller.getSnapshot().pendingRequest.clientRequestId;
  controller.editAsNew(); controller.updateDraft('New message');
  let sent;
  await controller.start(async request => { sent = request; return response; });
  assert.equal(sent, undefined);
  advance(3000);
  await controller.start(async request => { sent = request; return response; });
  assert.notEqual(sent.clientRequestId, firstId);
  assert.equal(sent.message, 'New message');
});
test('terminal failures cannot be blindly retried, including recovered bypass', async () => {
  for (const code of ['CHAT_REQUEST_PAYLOAD_MISMATCH', 'VALIDATION_ERROR', 'REPLY_TARGET_NOT_FOUND', 'ROUTE_NOT_FOUND']) {
    const { controller } = setup();
    await controller.start(async () => { throw failure(code, 400); });
    let calls = 0;
    await controller.retry(async () => { calls++; return response; }, true);
    assert.equal(calls, 0);
    assert.notEqual(controller.getSnapshot().pendingRequest, null);
  }
});
test('auth, verification and setup require recovery before replay', async () => {
  for (const code of ['INVALID_ACCESS_TOKEN', 'EMAIL_NOT_CONFIRMED', 'ONBOARDING_REQUIRED']) {
    const { controller } = setup();
    await controller.start(async () => { throw failure(code); });
    const original = controller.getSnapshot().pendingRequest;
    let calls = 0;
    const send = async request => { calls++; assert.equal(request, original); return response; };
    await controller.retry(send); assert.equal(calls, 0);
    await controller.retry(send, true); assert.equal(calls, 1);
  }
});
test('uncertainty survives a later definitive error', async () => {
  const { controller } = setup();
  await controller.start(async () => { throw failure('NETWORK_ERROR'); });
  await controller.retry(async () => { throw failure('EMAIL_NOT_CONFIRMED', 403); });
  assert.equal(controller.getSnapshot().failure.uncertain, true);
});
test('invalid quote is removed only when choosing to edit', async () => {
  const { controller } = setup();
  controller.selectReply({ id: quoteId, role: 'assistant', content: 'Old' });
  await controller.start(async () => { throw failure('REPLY_TARGET_NOT_FOUND', 404); });
  assert.equal(controller.getSnapshot().replyTarget.id, quoteId);
  controller.editAsNew();
  assert.equal(controller.getSnapshot().replyTarget, null);
  assert.equal(controller.getSnapshot().draft, ' Hello ');
});
test('blank and oversized drafts never reach send', async () => {
  const { controller } = setup();
  let calls = 0;
  for (const draft of ['  ', 'x'.repeat(4001)]) {
    controller.updateDraft(draft);
    await controller.start(async () => { calls++; return response; });
    assert.ok(controller.getSnapshot().validationError);
  }
  assert.equal(calls, 0);
});
test('a later display failure cannot resurrect a successful send', async () => {
  const { controller } = setup();
  await controller.start(async () => response);
  controller.setNotice('Your message was sent. Refresh the conversation.');
  let calls = 0;
  await controller.retry(async () => { calls++; return response; });
  assert.equal(calls, 0);
  assert.equal(controller.getSnapshot().failure, null);
});
test('failure classification preserves metadata and never asserts an uncertain send was not saved', () => {
  for (const error of [failure('NETWORK_ERROR'), failure('INVALID_RESPONSE', 200), failure('INTERNAL_ERROR', 500), new Error('timeout')]) {
    const result = classifySendFailure(error);
    assert.equal(result.action, 'retry');
    assert.equal(result.uncertain, true);
    assert.match(result.message, /may already be saved/);
  }
  assert.equal(classifySendFailure(failure('CONVERSATION_BUSY', 409)).waitSeconds, 3);
  assert.equal(classifySendFailure(failure('SERVICE_DRAINING', 503, 7)).waitSeconds, 7);
});

const React = require('react');
let alertArgs;
function Button() {}
const { ChatComposer } = load('src/features/chat/chat-composer.tsx', {
  react: React,
  'react/jsx-runtime': require('react/jsx-runtime'),
  'react-native': { Alert: { alert: (...args) => { alertArgs = args; } }, StyleSheet: { create: x => x }, Text: 'span', View: 'div', TextInput: 'input' },
  '@/design-system/components/button': { Button },
  '@/design-system/components/text-field': { TextField: 'input' },
});
function elements(node) {
  if (!React.isValidElement(node)) return [];
  return [node, ...React.Children.toArray(node.props.children).flatMap(elements)];
}
const props = { draft: 'Hello', errorMessage: 'Unconfirmed', notice: null, hasFailedSend: true, isSending: false, isEditable: false, canRetry: false, retrySeconds: 3, recoveryAction: 'retry', uncertain: true, replyTarget: null, onChangeDraft() {}, onRetry() {}, onSend() {}, recover() {}, editAsNew() {}, selectReply() {}, requestId: id, validationError: null };
test('composer disables countdown retry and locks pending text', () => {
  const nodes = elements(ChatComposer(props));
  assert.equal(nodes.find(x => x.type === 'input').props.editable, false);
  const retry = nodes.find(x => x.type === Button && x.props.children === 'Retry in 3s');
  assert.equal(retry.props.disabled, true);
});
test('uncertain editing requires explicit native confirmation', () => {
  let edits = 0;
  const nodes = elements(ChatComposer({ ...props, editAsNew: () => { edits++; } }));
  nodes.find(x => x.type === Button && x.props.children === 'Edit as new message').props.onPress();
  assert.equal(edits, 0);
  assert.match(alertArgs[1], /may already be saved/);
  alertArgs[2][1].onPress(); assert.equal(edits, 1);
});
test('blocked errors expose editing but no retry button', () => {
  const nodes = elements(ChatComposer({ ...props, recoveryAction: 'blocked' }));
  assert.equal(nodes.filter(x => x.type === Button).length, 1);
});
