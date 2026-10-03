import type { SQLiteDatabase } from 'expo-sqlite';

import type { ChatRequest, ReplyTarget } from '@/lib/api/types';
import type { RecoveryAction, SendFailure } from '@/features/chat/send-controller';

export type StoredDraft = {
  body: string;
  replyTarget: ReplyTarget | null;
};

export type StoredPendingSend = {
  request: ChatRequest;
  replyTarget: ReplyTarget | null;
  failure: SendFailure;
  retryAt: number;
  userMessageId: string | null;
};

type DraftRow = {
  body: string;
  reply_target_id: string | null;
  reply_target_content: string | null;
};

type PendingRow = DraftRow & {
  client_request_id: string;
  request_id: string | null;
  recovery_action: RecoveryAction | null;
  failure_message: string | null;
  uncertain: number;
  retry_at: number;
  remove_quote: number;
  user_message_id: string | null;
};

function replyTarget(row: DraftRow): ReplyTarget | null {
  if (!row.reply_target_id || row.reply_target_content === null) return null;
  return { id: row.reply_target_id, role: 'assistant', content: row.reply_target_content };
}

export async function loadChatState(db: SQLiteDatabase, userId: string) {
  const [draft, pending] = await Promise.all([
    db.getFirstAsync<DraftRow>(
      'SELECT body, reply_target_id, reply_target_content FROM drafts WHERE user_id = ?',
      userId,
    ),
    db.getFirstAsync<PendingRow>(
      `SELECT body, reply_target_id, reply_target_content, client_request_id, request_id,
        recovery_action, failure_message, uncertain, retry_at, remove_quote, user_message_id
       FROM pending_messages WHERE user_id = ?`,
      userId,
    ),
  ]);

  const storedDraft: StoredDraft | null = draft
    ? { body: draft.body, replyTarget: replyTarget(draft) }
    : null;
  if (!pending) return { draft: storedDraft, pending: null };

  const target = replyTarget(pending);
  const request: ChatRequest = {
    message: pending.body,
    clientRequestId: pending.client_request_id,
    ...(target ? { replyToMessageId: target.id } : {}),
  };
  const failure: SendFailure = {
    action: pending.recovery_action ?? 'retry',
    message: pending.failure_message
      ?? 'We couldn’t confirm Luni’s reply. Your message may already be saved. Retry to check the same send.',
    uncertain: Boolean(pending.uncertain),
    requestId: pending.request_id ?? pending.client_request_id,
    waitSeconds: 0,
    ...(pending.remove_quote ? { removeQuote: true } : {}),
  };
  return {
    draft: storedDraft,
    pending: {
      request,
      replyTarget: target,
      failure,
      retryAt: pending.retry_at,
      userMessageId: pending.user_message_id,
    } satisfies StoredPendingSend,
  };
}

// Keep the deletion guard for this database's lifetime, including late unmount flushes.
const accountWrites = new WeakMap<SQLiteDatabase, Map<string, {
  deleting: boolean;
  active: Set<Promise<unknown>>;
}>>();

function writesFor(db: SQLiteDatabase, userId: string) {
  let accounts = accountWrites.get(db);
  if (!accounts) accountWrites.set(db, accounts = new Map());
  let state = accounts.get(userId);
  if (!state) accounts.set(userId, state = { deleting: false, active: new Set() });
  return state;
}

async function persistForAccount(db: SQLiteDatabase, userId: string, write: () => Promise<void>) {
  const state = writesFor(db, userId);
  if (state.deleting) return;
  const pending = write();
  state.active.add(pending);
  try {
    await pending;
  } finally {
    state.active.delete(pending);
  }
}

export function saveDraft(db: SQLiteDatabase, userId: string, draft: StoredDraft) {
  return persistForAccount(db, userId, () => writeDraft(db, userId, draft));
}

async function writeDraft(
  db: SQLiteDatabase,
  userId: string,
  draft: StoredDraft,
) {
  if (!draft.body && !draft.replyTarget) {
    await db.runAsync('DELETE FROM drafts WHERE user_id = ?', userId);
    return;
  }
  await db.runAsync(
    `INSERT INTO drafts (user_id, body, reply_target_id, reply_target_content, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET body = excluded.body,
       reply_target_id = excluded.reply_target_id,
       reply_target_content = excluded.reply_target_content,
       updated_at = excluded.updated_at`,
    userId,
    draft.body,
    draft.replyTarget?.id ?? null,
    draft.replyTarget?.content ?? null,
    Date.now(),
  );
}

export function savePendingSend(
  db: SQLiteDatabase,
  userId: string,
  pending: Omit<StoredPendingSend, 'userMessageId'> & { userMessageId?: string | null },
) {
  return persistForAccount(db, userId, () => writePendingSend(db, userId, pending));
}

async function writePendingSend(
  db: SQLiteDatabase,
  userId: string,
  pending: Omit<StoredPendingSend, 'userMessageId'> & { userMessageId?: string | null },
) {
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO pending_messages (
       client_request_id, user_id, body, reply_target_id, reply_target_content,
       request_id, recovery_action, failure_message, uncertain, retry_at,
       remove_quote, user_message_id, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       client_request_id = excluded.client_request_id,
       body = excluded.body,
       reply_target_id = excluded.reply_target_id,
       reply_target_content = excluded.reply_target_content,
       request_id = excluded.request_id,
       recovery_action = excluded.recovery_action,
       failure_message = excluded.failure_message,
       uncertain = excluded.uncertain,
       retry_at = excluded.retry_at,
       remove_quote = excluded.remove_quote,
       user_message_id = COALESCE(excluded.user_message_id, pending_messages.user_message_id),
       updated_at = excluded.updated_at`,
    pending.request.clientRequestId,
    userId,
    pending.request.message,
    pending.replyTarget?.id ?? null,
    pending.replyTarget?.content ?? null,
    pending.failure.requestId,
    pending.failure.action,
    pending.failure.message,
    pending.failure.uncertain ? 1 : 0,
    pending.retryAt,
    pending.failure.removeQuote ? 1 : 0,
    pending.userMessageId ?? null,
    now,
    now,
  );
}

export async function clearPendingSend(db: SQLiteDatabase, userId: string) {
  await db.runAsync('DELETE FROM pending_messages WHERE user_id = ?', userId);
}

export async function clearAccountChatState(db: SQLiteDatabase, userId: string) {
  const state = writesFor(db, userId);
  state.deleting = true;
  await Promise.allSettled([...state.active]);
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM drafts WHERE user_id = ?', userId);
    await db.runAsync('DELETE FROM pending_messages WHERE user_id = ?', userId);
  });
}
