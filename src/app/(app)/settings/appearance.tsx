import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { AppearanceSettingsScreen } from '@/features/settings/appearance-settings-screen';
import { settingsRoutes } from '@/features/settings/routes';

export default function AppearanceSettingsRoute() {
  const router = useRouter();
  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(settingsRoutes.home);
  }, [router]);

  return <AppearanceSettingsScreen onClose={close} />;
}
