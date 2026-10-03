import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { SessionLoadingScreen } from '@/features/auth/session-loading-screen';
import { useMyProfile } from '@/features/profile/hooks';
import { DeleteAccountScreen } from '@/features/settings/delete-account-screen';
import { settingsRoutes } from '@/features/settings/routes';

export default function DeleteAccountSettingsRoute() {
  const router = useRouter();
  const { data: profile } = useMyProfile();
  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(settingsRoutes.account);
  }, [router]);

  if (!profile) return <SessionLoadingScreen message="Loading your account…" />;

  return <DeleteAccountScreen onBack={close} profile={profile} />;
}
