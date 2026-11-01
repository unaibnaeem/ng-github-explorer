import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpHeaders,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { errorInterceptor } from './error-interceptor';
import { ApiError } from './api-error';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should convert 404 errors into not-found ApiErrors', () => {
    let actualError: ApiError | undefined;

    http.get('/test').subscribe({
      error: (error: ApiError) => {
        actualError = error;
      },
    });

    const request = httpMock.expectOne('/test');

    request.flush(
      { message: 'Not Found' },
      {
        status: 404,
        statusText: 'Not Found',
      },
    );

    expect(actualError).toEqual({
      kind: 'not-found',
      message: 'User not found.',
    });
  });

  it('should convert rate-limit errors into rate-limit ApiErrors', () => {
    let actualError: ApiError | undefined;

    http.get('/test').subscribe({
      error: (error: ApiError) => {
        actualError = error;
      },
    });

    const request = httpMock.expectOne('/test');

    request.flush(
      { message: 'API rate limit exceeded' },
      {
        status: 403,
        statusText: 'Forbidden',
        headers: new HttpHeaders({
          'x-ratelimit-remaining': '0',
        }),
      },
    );

    expect(actualError).toEqual({
      kind: 'rate-limit',
      message: 'GitHub API rate limit reached.',
      retryAt: undefined,
    });
  });

  it('should convert network errors into network ApiErrors', () => {
    let actualError: ApiError | undefined;

    http.get('/test').subscribe({
      error: (error: ApiError) => {
        actualError = error;
      },
    });

    const request = httpMock.expectOne('/test');

    request.error(new ProgressEvent('error'));

    expect(actualError).toEqual({
      kind: 'network',
      message: "Can't reach GitHub. Check your internet connection.",
    });
  });

  it('should convert unknown HTTP errors into unknown ApiErrors', () => {
    let actualError: ApiError | undefined;

    http.get('/test').subscribe({
      error: (error: ApiError) => {
        actualError = error;
      },
    });

    const request = httpMock.expectOne('/test');

    request.flush(
      { message: 'Internal Server Error' },
      {
        status: 500,
        statusText: 'Internal Server Error',
      },
    );

    expect(actualError).toEqual({
      kind: 'unknown',
      message: 'Something went wrong. Please try again.',
    });
  });
});
