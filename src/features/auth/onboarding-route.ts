import { authRoutes } from '@/features/auth/routes';
import type { Profile } from '@/lib/api/types';

// Name editing remains available until onboarding is complete.
export function onboardingRedirect(profile: Profile, pathname: string) {
  if (!profile.preferredName) {
    return pathname === '/onboarding/name' ? null : authRoutes.preferredName;
  }
  if (!profile.onboardingCompletedAt) {
    return pathname === '/onboarding/name' || pathname === '/onboarding/style'
      ? null : authRoutes.conversationStyle;
  }
  return pathname === '/' ? null : authRoutes.authenticated;
}
