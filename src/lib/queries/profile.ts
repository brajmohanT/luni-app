import { queryOptions, mutationOptions, type QueryClient } from '@tanstack/react-query';
import { completeMyOnboarding, deleteMyAccount, getMyProfile, updateMyProfile } from '@/lib/api/profile';
import { ApiClientError } from '@/lib/api/errors';
import type { Profile, UpdateProfileRequest } from '@/lib/api/types';
import { withRequestTimeout } from '@/lib/api/with-request-timeout';

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
      // A confirmed profile save must not wait for an unrelated chat refresh.
      void client.invalidateQueries({ queryKey: ['account', userId, 'conversations'] });
    },
  };
}

export function updateProfileMutationOptions(client: QueryClient, userId: string | undefined) {
  return mutationOptions({
    ...profileWriteOptions(client, userId),
    networkMode: 'always',
    mutationFn: (request: UpdateProfileRequest) => {
      requireAccount(userId);
      return withRequestTimeout(signal => updateMyProfile(request, { expectedUserId: userId, signal }));
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

export function deleteMyAccountMutationOptions(client: QueryClient, userId: string | undefined) {
  const accountKey = ['account', userId ?? 'anonymous'] as const;
  return mutationOptions({
    scope: { id: `profile:${userId ?? 'anonymous'}` },
    retry: false,
    networkMode: 'always',
    onMutate: async () => {
      requireAccount(userId);
      await client.cancelQueries({ queryKey: accountKey });
    },
    mutationFn: () => {
      requireAccount(userId);
      return withRequestTimeout(signal => deleteMyAccount({ expectedUserId: userId, signal }));
    },
  });
}
