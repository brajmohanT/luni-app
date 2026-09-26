import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  profileQueryOptions, updateProfileMutationOptions, completeOnboardingMutationOptions,
} from '@/lib/queries/profile';
import { useAuth } from '@/providers/auth-provider';

export function useMyProfile() {
  const { session } = useAuth();
  return useQuery(profileQueryOptions(session?.user.id));
}

export function useUpdateMyProfile() {
  const { session } = useAuth();
  const client = useQueryClient();
  return useMutation(updateProfileMutationOptions(client, session?.user.id));
}

export function useCompleteMyOnboarding() {
  const { session } = useAuth();
  const client = useQueryClient();
  return useMutation(completeOnboardingMutationOptions(client, session?.user.id));
}
