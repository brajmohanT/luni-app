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

const persistence = load('src/lib/database/chat-persistence.ts');
const userId = 'account-1';
const requestId = '11111111-1111-4111-8111-111111111111';
const quoteId = '22222222-2222-4222-8222-222222222222';

test('loads account-scoped draft and immutable retry metadata', async () => {
  const db = {
    async getFirstAsync(sql, id) {
      assert.equal(id, userId);
      if (sql.includes('FROM drafts')) {
        return { body: 'Draft', reply_target_id: quoteId, reply_target_content: 'Quote' };
      }
      return {
        body: 'Pending', reply_target_id: quoteId, reply_target_content: 'Quote',
        client_request_id: requestId, request_id: requestId, recovery_action: 'retry',
        failure_message: 'Try again', uncertain: 1, retry_at: 9000, remove_quote: 0,
        user_message_id: null,
      };
    },
  };
  const stored = await persistence.loadChatState(db, userId);
  assert.equal(stored.draft.body, 'Draft');
  assert.equal(stored.pending.request.clientRequestId, requestId);
  assert.equal(stored.pending.request.replyToMessageId, quoteId);
  assert.equal(stored.pending.failure.uncertain, true);
  assert.equal(stored.pending.retryAt, 9000);
});

test('writes account ownership, quote, failure and confirmed message identity', async () => {
  let call;
  const db = { async runAsync(...args) { call = args; } };
  await persistence.savePendingSend(db, userId, {
    request: { message: 'Pending', clientRequestId: requestId, replyToMessageId: quoteId },
    replyTarget: { id: quoteId, role: 'assistant', content: 'Quote' },
    failure: { action: 'retry', message: 'Try again', uncertain: true, requestId, waitSeconds: 0 },
    retryAt: 9000,
    userMessageId: quoteId,
  });
  assert.match(call[0], /ON CONFLICT\(user_id\)/);
  assert.equal(call[1], requestId);
  assert.equal(call[2], userId);
  assert.equal(call[3], 'Pending');
  assert.equal(call[4], quoteId);
  assert.equal(call[12], quoteId);
});

test('empty drafts and completed pending sends delete only the active account row', async () => {
  const calls = [];
  const db = { async runAsync(...args) { calls.push(args); } };
  await persistence.saveDraft(db, userId, { body: '', replyTarget: null });
  await persistence.clearPendingSend(db, userId);
  assert.deepEqual(calls.map(call => call[1]), [userId, userId]);
  assert.match(calls[0][0], /DELETE FROM drafts/);
  assert.match(calls[1][0], /DELETE FROM pending_messages/);
});

test('deletion drains active writes and blocks late unmount writes only for that account', async () => {
  const calls = [];
  let finishWrite;
  const db = {
    async withTransactionAsync(task) { calls.push('cleanup'); await task(); },
    async runAsync(sql, id) {
      calls.push([sql, id]);
      if (sql.includes('INSERT INTO drafts') && id === userId) {
        await new Promise(resolve => { finishWrite = resolve; });
      }
    },
  };
  const write = persistence.saveDraft(db, userId, { body: 'Private draft', replyTarget: null });
  const cleanup = persistence.clearAccountChatState(db, userId);
  assert.equal(calls.length, 1);
  finishWrite();
  await Promise.all([write, cleanup]);
  assert.equal(calls[1], 'cleanup');
  const count = calls.length;
  await persistence.saveDraft(db, userId, { body: 'Unmount flush', replyTarget: null });
  await persistence.savePendingSend(db, userId, {});
  assert.equal(calls.length, count);
  await persistence.saveDraft(db, 'other-account', { body: 'Keep me', replyTarget: null });
  assert.equal(calls.at(-1)[1], 'other-account');
});

test('failed deletion cleanup remains write-blocked and can be retried', async () => {
  let fails = true;
  let writes = 0;
  const db = {
    async withTransactionAsync(task) {
      if (fails) throw new Error('disk error');
      await task();
    },
    async runAsync() { writes++; },
  };
  await assert.rejects(persistence.clearAccountChatState(db, userId), /disk error/);
  await persistence.saveDraft(db, userId, { body: 'Late write', replyTarget: null });
  assert.equal(writes, 0);
  fails = false;
  await persistence.clearAccountChatState(db, userId);
  assert.equal(writes, 2);
});

test('accepted account deletion clears all account-scoped chat recovery in one transaction', async () => {
  const calls = [];
  const db = {
    async withTransactionAsync(task) { calls.push('begin'); await task(); calls.push('commit'); },
    async runAsync(...args) { calls.push(args); },
  };
  await persistence.clearAccountChatState(db, userId);
  assert.equal(calls[0], 'begin');
  assert.match(calls[1][0], /DELETE FROM drafts/);
  assert.equal(calls[1][1], userId);
  assert.match(calls[2][0], /DELETE FROM pending_messages/);
  assert.equal(calls[2][1], userId);
  assert.equal(calls[3], 'commit');
});
