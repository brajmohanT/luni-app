import { Redirect, Stack } from 'expo-router';

import { authRoutes } from '@/features/auth/routes';
import { useAuth } from '@/providers/auth-provider';

export default function AppLayout() {
  const { session } = useAuth();

  if (!session) {
    return <Redirect href={authRoutes.signIn} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
