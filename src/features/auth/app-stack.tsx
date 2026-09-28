import { Stack } from 'expo-router';
import type { Profile } from '@/lib/api/types';

export function AppStack({ profile }: { profile: Profile }) {
  const complete = Boolean(profile.preferredName && profile.onboardingCompletedAt);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!complete}>
        <Stack.Screen name="onboarding/name" />
        <Stack.Protected guard={Boolean(profile.preferredName)}>
          <Stack.Screen name="onboarding/style" />
        </Stack.Protected>
      </Stack.Protected>
      <Stack.Protected guard={false}>
        <Stack.Screen name="chat/new" />
        <Stack.Screen name="conversations/[conversationId]" />
      </Stack.Protected>
    </Stack>
  );
}
