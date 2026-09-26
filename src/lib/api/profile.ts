import { apiRequest } from '@/lib/api/client';
import {
  profileSchema,
  updateProfileRequestSchema,
  type Profile,
  type UpdateProfileRequest,
} from '@/lib/api/types';

type ProfileRequestOptions = {
  signal?: AbortSignal;
  requestId?: string;
};

export function getMyProfile(options: ProfileRequestOptions = {}): Promise<Profile> {
  return apiRequest({
    path: '/me',
    method: 'GET',
    responseSchema: profileSchema,
    signal: options.signal,
    requestId: options.requestId,
  });
}

export function updateMyProfile(
  request: UpdateProfileRequest,
  options: ProfileRequestOptions = {},
): Promise<Profile> {
  const body = updateProfileRequestSchema.parse(request);

  return apiRequest({
    path: '/me',
    method: 'PATCH',
    body,
    responseSchema: profileSchema,
    signal: options.signal,
    requestId: options.requestId,
  });
}

export function completeMyOnboarding(options: ProfileRequestOptions = {}): Promise<Profile> {
  return apiRequest({
    path: '/me/onboarding/complete',
    method: 'POST',
    responseSchema: profileSchema,
    signal: options.signal,
    requestId: options.requestId,
  });
}
