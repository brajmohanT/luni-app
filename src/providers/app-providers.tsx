import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { type PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { ThemeProvider, type ThemePreference } from '@/design-system/theme';
import { DATABASE_NAME } from '@/lib/database/database';
import { migrateDatabase } from '@/lib/database/migrations';
import { readThemePreference, writeThemePreference } from '@/lib/database/preferences';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

function PersistedThemeProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [initialPreference] = useState(() => readThemePreference(db));
  const persistPreference = useCallback(
    (preference: ThemePreference) => writeThemePreference(db, preference),
    [db],
  );

  return (
    <ThemeProvider initialPreference={initialPreference} onPreferenceChange={persistPreference}>
      {children}
    </ThemeProvider>
  );
}

function AccountQueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());
  useEffect(() => () => queryClient.clear(), [queryClient]);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function AccountQueries({ children }: PropsWithChildren) {
  const { session } = useAuth();
  // Remount observers and drafts, and discard the prior account's query cache.
  return (
    <AccountQueryProvider key={session?.user.id ?? 'anonymous'}>
      {children}
    </AccountQueryProvider>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
      <PersistedThemeProvider>
        <AuthProvider>
          <AccountQueries>{children}</AccountQueries>
        </AuthProvider>
      </PersistedThemeProvider>
    </SQLiteProvider>
  );
}
