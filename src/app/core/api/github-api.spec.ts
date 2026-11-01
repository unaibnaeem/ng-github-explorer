import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { GithubApi } from './github-api';
import { GithubRepo, GithubUser } from './github-api.types';

describe('GithubApi', () => {
  let service: GithubApi;
  let httpMock: HttpTestingController;

  const baseUrl = 'https://api.github.com';

  const mockUser: GithubUser = {
    id: 1,
    login: 'octocat',
    name: 'The Octocat',
    avatar_url: 'https://github.com/images/octocat.png',
    html_url: 'https://github.com/octocat',
    bio: 'GitHub mascot',
    followers: 100,
    following: 50,
    public_repos: 2,
  };

  const mockRepo: GithubRepo = {
    id: 1,
    name: 'Hello-World',
    full_name: 'octocat/Hello-World',
    html_url: 'https://github.com/octocat/Hello-World',
    description: 'My first repository',
    stargazers_count: 10,
    forks_count: 2,
    language: 'TypeScript',
    updated_at: '2026-01-01T00:00:00Z',
    fork: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GithubApi, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(GithubApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch a GitHub user', () => {
    let actualUser: GithubUser | undefined;

    service.getUser('octocat').subscribe((user) => {
      actualUser = user;
    });

    const req = httpMock.expectOne(`${baseUrl}/users/octocat`);

    expect(req.request.method).toBe('GET');

    req.flush(mockUser);

    expect(actualUser).toEqual(mockUser);
  });

  it('should encode the username when fetching a user', () => {
    service.getUser('octo cat').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/users/octo%20cat`);

    expect(req.request.method).toBe('GET');

    req.flush(mockUser);
  });

  it('should fetch repositories with the correct pagination parameters', () => {
    let actualRepos: GithubRepo[] | undefined;

    service.getRepos('octocat', 3).subscribe((repos) => {
      actualRepos = repos;
    });

    const req = httpMock.expectOne(
      `${baseUrl}/users/octocat/repos?per_page=100&page=3`,
    );

    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('per_page')).toBe('100');
    expect(req.request.params.get('page')).toBe('3');

    req.flush([mockRepo]);

    expect(actualRepos).toEqual([mockRepo]);
  });

  it('should encode the username when fetching repositories', () => {
    service.getRepos('octo cat', 1).subscribe();

    const req = httpMock.expectOne(
      `${baseUrl}/users/octo%20cat/repos?per_page=100&page=1`,
    );

    expect(req.request.method).toBe('GET');

    req.flush([mockRepo]);
  });

  it('should propagate errors when fetching a user', () => {
    let actualError: unknown;

    service.getUser('unknown-user').subscribe({
      error: (error) => {
        actualError = error;
      },
    });

    const req = httpMock.expectOne(`${baseUrl}/users/unknown-user`);

    req.flush(
      { message: 'Not Found' },
      {
        status: 404,
        statusText: 'Not Found',
      },
    );

    expect(actualError).toBeTruthy();
    expect((actualError as { status: number }).status).toBe(404);
  });

  it('should propagate errors when fetching repositories', () => {
    let actualError: unknown;

    service.getRepos('octocat', 1).subscribe({
      error: (error) => {
        actualError = error;
      },
    });

    const req = httpMock.expectOne(
      `${baseUrl}/users/octocat/repos?per_page=100&page=1`,
    );

    req.flush(
      { message: 'API rate limit exceeded' },
      {
        status: 403,
        statusText: 'Forbidden',
      },
    );

    expect(actualError).toBeTruthy();
    expect((actualError as { status: number }).status).toBe(403);
  });
});
