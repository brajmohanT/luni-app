import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 1;

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

  await db.execAsync(`PRAGMA user_version = ${currentVersion}`);
}
