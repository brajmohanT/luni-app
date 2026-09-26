import { queryOptions, mutationOptions, type QueryClient } from '@tanstack/react-query';
import { getMyProfile, updateMyProfile, completeMyOnboarding } from '@/lib/api/profile';
import { ApiClientError } from '@/lib/api/errors';
import type { Profile, UpdateProfileRequest } from '@/lib/api/types';

export const profileKeys = {
  detail: (userId: string) => ['account', userId, 'profile'] as const,
};

export function requireAccount(userId: string | undefined): asserts userId is string {
  if (!userId) {
    throw new ApiClientError('Sign in to continue.', {
      code: 'MISSING_SESSION', status: null, requestId: null,
    });
  }
}

export function profileQueryOptions(userId: string | undefined) {
  return queryOptions({
    queryKey: profileKeys.detail(userId ?? 'anonymous'),
    enabled: Boolean(userId),
    retry: false,
    staleTime: 30_000,
    queryFn: ({ signal }) => {
      requireAccount(userId);
      return getMyProfile({ signal, expectedUserId: userId });
    },
  });
}

function profileWriteOptions(client: QueryClient, userId: string | undefined) {
  const queryKey = profileKeys.detail(userId ?? 'anonymous');
  return {
    scope: { id: `profile:${userId ?? 'anonymous'}` },
    retry: false as const,
    onMutate: async () => {
      requireAccount(userId);
      await client.cancelQueries({ queryKey });
    },
    onSuccess: async (profile: Profile) => {
      // Cancel a read started during the write before publishing confirmed state.
      await client.cancelQueries({ queryKey });
      client.setQueryData<Profile>(queryKey, (current) =>
        current && current.profileVersion > profile.profileVersion ? current : profile,
      );
      // Restart queries previously blocked by incomplete onboarding.
      await client.invalidateQueries({ queryKey: ['account', userId, 'conversations'] });
    },
  };
}

export function updateProfileMutationOptions(client: QueryClient, userId: string | undefined) {
  return mutationOptions({
    ...profileWriteOptions(client, userId),
    mutationFn: (request: UpdateProfileRequest) => {
      requireAccount(userId);
      return updateMyProfile(request, { expectedUserId: userId });
    },
  });
}

export function completeOnboardingMutationOptions(client: QueryClient, userId: string | undefined) {
  return mutationOptions({
    ...profileWriteOptions(client, userId),
    mutationFn: () => {
      requireAccount(userId);
      return completeMyOnboarding({ expectedUserId: userId });
    },
  });
}
