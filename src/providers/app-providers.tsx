import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SQLiteProvider } from 'expo-sqlite';
import { type PropsWithChildren, useState } from 'react';

import { DATABASE_NAME } from '@/lib/database/database';
import { migrateDatabase } from '@/lib/database/migrations';
import { AuthProvider } from '@/providers/auth-provider';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
        <AuthProvider>{children}</AuthProvider>
      </SQLiteProvider>
    </QueryClientProvider>
  );
}
