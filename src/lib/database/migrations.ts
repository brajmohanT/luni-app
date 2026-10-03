import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 3;

export async function migrateDatabase(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = result?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  if (currentVersion === 0) {
    await db.execAsync(`
      CREATE TABLE drafts (
        conversation_id TEXT PRIMARY KEY NOT NULL,
        body TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE pending_messages (
        id TEXT PRIMARY KEY NOT NULL,
        conversation_id TEXT NOT NULL,
        body TEXT NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE cached_conversations (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE cached_messages (
        id TEXT PRIMARY KEY NOT NULL,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES cached_conversations(id) ON DELETE CASCADE
      );

      CREATE INDEX cached_messages_conversation_created_at
        ON cached_messages (conversation_id, created_at);
    `);
    currentVersion = 1;
  }

  if (currentVersion === 1) {
    // Version 1 only reserved these tables; no product screen read or wrote them.
    // Recreate them with account-scoped fields before enabling persistence.
    await db.execAsync(`
      DROP TABLE drafts;
      DROP TABLE pending_messages;

      CREATE TABLE drafts (
        user_id TEXT PRIMARY KEY NOT NULL,
        body TEXT NOT NULL,
        reply_target_id TEXT,
        reply_target_content TEXT,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE pending_messages (
        client_request_id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL UNIQUE,
        body TEXT NOT NULL,
        reply_target_id TEXT,
        reply_target_content TEXT,
        request_id TEXT,
        recovery_action TEXT,
        failure_message TEXT,
        uncertain INTEGER NOT NULL DEFAULT 1,
        retry_at INTEGER NOT NULL DEFAULT 0,
        remove_quote INTEGER NOT NULL DEFAULT 0,
        user_message_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX pending_messages_user_id ON pending_messages (user_id);
    `);
    currentVersion = 2;
  }

  if (currentVersion === 2) {
    await db.execAsync(`
      CREATE TABLE app_preferences (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    currentVersion = 3;
  }

  await db.execAsync(`PRAGMA user_version = ${currentVersion}`);
}
