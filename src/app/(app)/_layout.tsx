import { Redirect } from 'expo-router';
import { AppStack } from '@/features/auth/app-stack';
import { authRoutes } from '@/features/auth/routes';
import { entryFailure } from '@/features/auth/entry-failure';
import { EntryRecovery } from '@/features/auth/entry-recovery';
import { SessionLoadingScreen } from '@/features/auth/session-loading-screen';
import { useMyProfile } from '@/features/profile/hooks';
import { useAuth } from '@/providers/auth-provider';

export default function AppLayout() {
  const { session } = useAuth();
  if (!session) return <Redirect href={authRoutes.signIn} />;
  return <ProfileGate />;
}

function ProfileGate() {
  const profile = useMyProfile();
  if (profile.isError && (!profile.data || entryFailure(profile.error, 'profile').action !== 'retry')) {
    return <EntryRecovery error={profile.error} target="profile" onRetry={() => profile.refetch()} />;
  }
  if (!profile.data) return <SessionLoadingScreen message="Loading your profile…" />;
  return <AppStack profile={profile.data} />;
}
