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
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  expectedUserId?: string;
  // Reuse this UUID when retrying the same logical request.
  requestId?: string;
};

async function getAccessToken(expectedUserId?: string) {
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

  if (expectedUserId && data.session.user.id !== expectedUserId) {
    throw new ApiClientError('Your account changed. Please try again.', {
      code: 'MISSING_SESSION', status: null, requestId: null,
    });
  }

  return data.session.access_token;
}

function getClientHeaders(accessToken: string, requestId: string) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'X-App-Version': Constants.nativeApplicationVersion ?? Constants.expoConfig?.version ?? 'unknown',
    'X-Platform': Platform.OS,
    'X-Platform-Version': String(Platform.Version),
    'X-Request-Id': requestId,
  };

  if (Constants.nativeBuildVersion) {
    headers['X-App-Build'] = Constants.nativeBuildVersion;
  }

  return headers;
}

function getUrl(path: string) {
  return `${env.apiUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

// API v2 defines Retry-After as a positive integer number of seconds.
function parseRetryAfter(response: Response): number | null {
  const value = response.headers.get('Retry-After')?.trim();
  if (!value || !/^\d+$/.test(value)) return null;
  const seconds = Number(value);
  return Number.isSafeInteger(seconds) && seconds >= 1 ? seconds : null;
}

async function parseError(response: Response, sentRequestId: string): Promise<ApiClientError> {
  const retryAfterSeconds = parseRetryAfter(response);
  const requestId = response.headers.get('X-Request-Id') || sentRequestId;
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return new ApiClientError('The service returned an invalid error response.', {
      code: 'INVALID_RESPONSE',
      status: response.status,
      requestId,
      retryAfterSeconds,
    });
  }

  const result = apiErrorSchema.safeParse(payload);

  if (!result.success) {
    return new ApiClientError('The service returned an invalid error response.', {
      code: 'INVALID_RESPONSE',
      status: response.status,
      requestId,
      retryAfterSeconds,
    });
  }

  return toApiClientError(result.data, response.status, requestId, retryAfterSeconds);
}

function toApiClientError(
  error: ApiError,
  status: number,
  requestId: string,
  retryAfterSeconds: number | null,
) {
  return new ApiClientError(error.message, {
    code: error.code,
    status,
    requestId,
    details: error.details,
    retryAfterSeconds,
  });
}

export async function apiRequest<T>({
  path,
  responseSchema,
  method = 'GET',
  body,
  signal,
  expectedUserId,
  requestId: sentRequestId = Crypto.randomUUID(),
}: ApiRequestOptions<T>): Promise<T> {
  const accessToken = await getAccessToken(expectedUserId);
  const headers = getClientHeaders(accessToken, sentRequestId);

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
      requestId: sentRequestId,
      cause: error,
    });
  }

  if (!response.ok) {
    throw await parseError(response, sentRequestId);
  }

  const requestId = response.headers.get('X-Request-Id') || sentRequestId;
  let payload: unknown;

  try {
    payload = await response.json();
  } catch (error) {
    throw new ApiClientError('The service returned an invalid response.', {
      code: 'INVALID_RESPONSE',
      status: response.status,
      requestId,
      retryAfterSeconds: parseRetryAfter(response),
      cause: error,
    });
  }

  const result = responseSchema.safeParse(payload);

  if (!result.success) {
    if (__DEV__) {
      console.warn('API response validation failed', {
        path,
        requestId,
        issues: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
      });
    }
    throw new ApiClientError('The service returned an invalid response.', {
      code: 'INVALID_RESPONSE',
      status: response.status,
      requestId,
      retryAfterSeconds: parseRetryAfter(response),
    });
  }

  return result.data;
}
