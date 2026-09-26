import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SQLiteProvider } from 'expo-sqlite';
import { type PropsWithChildren, useEffect, useState } from 'react';

import { ThemeProvider } from '@/design-system/theme';
import { DATABASE_NAME } from '@/lib/database/database';
import { migrateDatabase } from '@/lib/database/migrations';
import { AuthProvider, useAuth } from '@/providers/auth-provider';

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
      <ThemeProvider>
        <AuthProvider>
          <AccountQueries>{children}</AccountQueries>
        </AuthProvider>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
