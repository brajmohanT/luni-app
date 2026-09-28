import { Redirect } from 'expo-router';

import { authRoutes } from '@/features/auth/routes';
import { useAuth } from '@/providers/auth-provider';

export default function IndexScreen() {
  const { session } = useAuth();

  return <Redirect href={session ? authRoutes.authenticated : authRoutes.welcome} />;
}
