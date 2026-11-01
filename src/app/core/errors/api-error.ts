import { HttpErrorResponse } from '@angular/common/http';

export type ErrorKind = 'not-found' | 'rate-limit' | 'network' | 'unknown';

export interface ApiError {
  kind: ErrorKind;
  message: string;
  retryAt?: Date;
}

export function toApiError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return {
      kind: 'unknown',
      message: 'Something went wrong.',
    };
  }

  if (error.status === 0) {
    return {
      kind: 'network',
      message: "Can't reach GitHub. Check your internet connection.",
    };
  }

  if (error.status === 404) {
    return {
      kind: 'not-found',
      message: 'User not found.',
    };
  }

  const remaining = error.headers.get('x-ratelimit-remaining');
  const retryAfter = error.headers.get('retry-after');
  const reset = Number(error.headers.get('x-ratelimit-reset'));

  const isRateLimited =
    error.status === 429 ||
    (error.status === 403 && (remaining === '0' || retryAfter !== null));

  if (isRateLimited) {
    const retryAt =
      Number.isFinite(reset) && reset > 0
        ? new Date(reset * 1000)
        : retryAfter !== null && Number(retryAfter) > 0
          ? new Date(Date.now() + Number(retryAfter) * 1000)
          : undefined;

    return {
      kind: 'rate-limit',
      message: 'GitHub API rate limit reached.',
      retryAt,
    };
  }

  return {
    kind: 'unknown',
    message: 'Something went wrong. Please try again.',
  };
}
