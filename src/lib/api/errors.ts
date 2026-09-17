import type { ApiError, ApiErrorCode } from '@/lib/api/types';

export type ClientErrorCode = ApiErrorCode | 'INVALID_RESPONSE' | 'MISSING_SESSION' | 'NETWORK_ERROR';

type ApiClientErrorOptions = {
  code: ClientErrorCode;
  status: number | null;
  requestId: string | null;
  details?: ApiError['details'];
  cause?: unknown;
};

export class ApiClientError extends Error {
  readonly code: ClientErrorCode;
  readonly status: number | null;
  readonly requestId: string | null;
  readonly details?: ApiError['details'];

  constructor(message: string, options: ApiClientErrorOptions) {
    super(message, { cause: options.cause });
    this.name = 'ApiClientError';
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
    this.details = options.details;
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}
