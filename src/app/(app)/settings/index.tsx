import { useRouter } from 'expo-router';

import { useTheme } from '@/design-system/theme';
import { SessionLoadingScreen } from '@/features/auth/session-loading-screen';
import { useMyProfile } from '@/features/profile/hooks';
import { SettingsHomeScreen } from '@/features/settings/settings-home-screen';
import { settingsRoutes } from '@/features/settings/routes';
import { appearanceLabel } from '@/features/settings/values';

export default function SettingsRoute() {
  const router = useRouter();
  const { preference } = useTheme();
  const { data: profile } = useMyProfile();

  if (!profile) return <SessionLoadingScreen message="Loading settings…" />;

  return (
    <SettingsHomeScreen
      appearance={appearanceLabel(preference)}
      onBack={() => router.canGoBack() ? router.back() : router.replace('/(app)')}
      onOpenAccount={() => router.push(settingsRoutes.account)}
      onOpenAppearance={() => router.push(settingsRoutes.appearance)}
      onOpenProfile={() => router.push(settingsRoutes.profile)}
      onOpenStyle={() => router.push(settingsRoutes.style)}
      profile={profile}
    />
  );
}
