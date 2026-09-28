import { Redirect } from 'expo-router';
import { authRoutes } from '@/features/auth/routes';

// Keep existing links valid without selecting or creating another conversation.
export default function LegacyChatRedirect() {
  return <Redirect href={authRoutes.authenticated} />;
}
