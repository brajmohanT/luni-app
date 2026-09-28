import { Redirect } from 'expo-router';
import { onboardingRedirect } from '@/features/auth/onboarding-route';
import { SessionLoadingScreen } from '@/features/auth/session-loading-screen';
import CompanionChatScreen from '@/features/chat/companion-chat-screen';
import { useMyProfile } from '@/features/profile/hooks';

export default function AuthenticatedEntry() {
  const { data: profile } = useMyProfile();
  if (!profile) return <SessionLoadingScreen message="Loading your profile…" />;
  const destination = onboardingRedirect(profile, '/');
  return destination ? <Redirect href={destination} /> : <CompanionChatScreen />;
}
