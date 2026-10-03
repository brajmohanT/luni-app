import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { SessionLoadingScreen } from '@/features/auth/session-loading-screen';
import { useMyProfile } from '@/features/profile/hooks';
import { settingsRoutes } from '@/features/settings/routes';
import { StyleSettingsScreen } from '@/features/settings/style-settings-screen';

export default function StyleSettingsRoute() {
  const router = useRouter();
  const { data: profile } = useMyProfile();
  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(settingsRoutes.home);
  }, [router]);

  if (!profile) return <SessionLoadingScreen message="Loading your conversation style…" />;

  return <StyleSettingsScreen onClose={close} profile={profile} />;
}
