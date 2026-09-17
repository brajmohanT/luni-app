import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import type { ZodType } from 'zod';

import { ApiClientError } from '@/lib/api/errors';
import { apiErrorSchema, type ApiError } from '@/lib/api/types';
import { supabase } from '@/lib/auth/supabase';
import { env } from '@/lib/config/env';

type ApiRequestOptions<T> = {
  path: string;
  responseSchema: ZodType<T>;
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
};

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new ApiClientError('Unable to restore your session.', {
      code: 'MISSING_SESSION',
      status: null,
      requestId: null,
      cause: error,
    });
  }

  if (!data.session?.access_token) {
    throw new ApiClientError('Sign in to continue.', {
      code: 'MISSING_SESSION',
      status: null,
      requestId: null,
    });
  }

  return data.session.access_token;
}

function getClientHeaders(accessToken: string) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'X-App-Version': Constants.nativeApplicationVersion ?? Constants.expoConfig?.version ?? 'unknown',
    'X-Platform': Platform.OS,
    'X-Platform-Version': String(Platform.Version),
    'X-Request-Id': Crypto.randomUUID(),
  };

  if (Constants.nativeBuildVersion) {
    headers['X-App-Build'] = Constants.nativeBuildVersion;
  }

  return headers;
}

function getUrl(path: string) {
  return `${env.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function parseError(response: Response): Promise<ApiClientError> {
  const requestId = response.headers.get('X-Request-Id');
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return new ApiClientError('The service returned an invalid error response.', {
      code: 'INVALID_RESPONSE',
      status: response.status,
      requestId,
    });
  }

  const result = apiErrorSchema.safeParse(payload);

  if (!result.success) {
    return new ApiClientError('The service returned an invalid error response.', {
      code: 'INVALID_RESPONSE',
      status: response.status,
      requestId,
    });
  }

  return toApiClientError(result.data, response.status, requestId);
}

function toApiClientError(error: ApiError, status: number, requestId: string | null) {
  return new ApiClientError(error.message, {
    code: error.code,
    status,
    requestId,
    details: error.details,
  });
}

export async function apiRequest<T>({
  path,
  responseSchema,
  method = 'GET',
  body,
  signal,
}: ApiRequestOptions<T>): Promise<T> {
  const accessToken = await getAccessToken();
  const headers = getClientHeaders(accessToken);

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;

  try {
    response = await fetch(getUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    throw new ApiClientError('Unable to reach the service. Check your connection and try again.', {
      code: 'NETWORK_ERROR',
      status: null,
      requestId: null,
      cause: error,
    });
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  const requestId = response.headers.get('X-Request-Id');
  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error) {
    throw new ApiClientError('The service returned an invalid response.', {
      code: 'INVALID_RESPONSE',
      status: response.status,
      requestId,
      cause: error,
    });
  }

  const result = responseSchema.safeParse(payload);

  if (!result.success) {
    throw new ApiClientError('The service returned an invalid response.', {
      code: 'INVALID_RESPONSE',
      status: response.status,
      requestId,
    });
  }

  return result.data;
}
