import type { SQLiteDatabase } from 'expo-sqlite';

import type { ThemePreference } from '@/design-system/theme';

const APPEARANCE_KEY = 'appearance';
const themePreferences = new Set<ThemePreference>(['light', 'dark', 'system']);

export function parseThemePreference(value: unknown): ThemePreference {
  return typeof value === 'string' && themePreferences.has(value as ThemePreference)
    ? value as ThemePreference
    : 'system';
}

export function readThemePreference(db: SQLiteDatabase): ThemePreference {
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM app_preferences WHERE key = ?',
    APPEARANCE_KEY,
  );
  return parseThemePreference(row?.value);
}

export async function writeThemePreference(db: SQLiteDatabase, preference: ThemePreference) {
  await db.runAsync(
    `INSERT INTO app_preferences (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    APPEARANCE_KEY,
    preference,
  );
}
