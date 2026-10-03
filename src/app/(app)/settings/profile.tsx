import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { SessionLoadingScreen } from '@/features/auth/session-loading-screen';
import { useMyProfile } from '@/features/profile/hooks';
import { ProfileSettingsScreen } from '@/features/settings/profile-settings-screen';
import { settingsRoutes } from '@/features/settings/routes';

export default function ProfileSettingsRoute() {
  const router = useRouter();
  const { data: profile } = useMyProfile();
  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(settingsRoutes.home);
  }, [router]);

  if (!profile) return <SessionLoadingScreen message="Loading your profile…" />;

  return <ProfileSettingsScreen onClose={close} profile={profile} />;
}
