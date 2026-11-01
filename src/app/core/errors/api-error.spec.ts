import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import { toApiError } from './api-error';

describe('toApiError', () => {
  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('should return an unknown error for non-HTTP errors', () => {
    const result = toApiError(new Error('Something failed'));

    expect(result).toEqual({
      kind: 'unknown',
      message: 'Something went wrong.',
    });
  });

  it('should identify network errors', () => {
    const error = new HttpErrorResponse({
      status: 0,
      statusText: 'Unknown Error',
    });

    const result = toApiError(error);

    expect(result).toEqual({
      kind: 'network',
      message: "Can't reach GitHub. Check your internet connection.",
    });
  });

  it('should identify 404 errors', () => {
    const error = new HttpErrorResponse({
      status: 404,
      statusText: 'Not Found',
    });

    const result = toApiError(error);

    expect(result).toEqual({
      kind: 'not-found',
      message: 'User not found.',
    });
  });

  it('should identify rate limits with a 429 status', () => {
    const error = new HttpErrorResponse({
      status: 429,
      statusText: 'Too Many Requests',
    });

    const result = toApiError(error);

    expect(result.kind).toBe('rate-limit');
    expect(result.message).toBe('GitHub API rate limit reached.');
  });

  it('should identify rate limits with a 403 status and zero remaining requests', () => {
    const error = new HttpErrorResponse({
      status: 403,
      statusText: 'Forbidden',
      headers: new HttpHeaders({
        'x-ratelimit-remaining': '0',
      }),
    });

    const result = toApiError(error);

    expect(result.kind).toBe('rate-limit');
  });

  it('should calculate retry time from the rate limit reset header', () => {
    const resetTimestamp = 1800000000;

    const error = new HttpErrorResponse({
      status: 403,
      statusText: 'Forbidden',
      headers: new HttpHeaders({
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': String(resetTimestamp),
      }),
    });

    const result = toApiError(error);

    expect(result.retryAt).toEqual(new Date(resetTimestamp * 1000));
  });

  it('should calculate retry time from the Retry-After header', () => {
    const now = new Date('2026-01-01T12:00:00Z');

    jasmine.clock().install();
    jasmine.clock().mockDate(now);

    const error = new HttpErrorResponse({
      status: 429,
      statusText: 'Too Many Requests',
      headers: new HttpHeaders({
        'retry-after': '60',
      }),
    });

    const result = toApiError(error);

    expect(result.retryAt).toEqual(new Date('2026-01-01T12:01:00Z'));
  });

  it('should identify other HTTP errors as unknown', () => {
    const error = new HttpErrorResponse({
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = toApiError(error);

    expect(result).toEqual({
      kind: 'unknown',
      message: 'Something went wrong. Please try again.',
    });
  });
});
