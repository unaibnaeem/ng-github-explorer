import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject } from 'rxjs';

import { ProfileStore } from './profile-store';
import { GithubApi } from '../../core/api/github-api';
import { GithubRepo, GithubUser } from '../../core/api/github-api.types';
import { ApiError } from '../../core/errors/api-error';

describe('ProfileStore', () => {
  let store: ProfileStore;
  let api: jasmine.SpyObj<GithubApi>;

  const createUser = (overrides: Partial<GithubUser> = {}): GithubUser => ({
    id: 1,
    login: 'octocat',
    name: 'The Octocat',
    avatar_url: 'https://github.com/images/error/octocat_happy.gif',
    html_url: 'https://github.com/octocat',
    bio: 'GitHub mascot',
    followers: 100,
    following: 50,
    public_repos: 2,
    ...overrides,
  });

  const createRepo = (overrides: Partial<GithubRepo> = {}): GithubRepo => ({
    id: 1,
    name: 'repo-one',
    full_name: 'octocat/repo-one',
    html_url: 'https://github.com/octocat/repo-one',
    description: 'Test repository',
    stargazers_count: 10,
    forks_count: 2,
    language: 'TypeScript',
    updated_at: '2026-01-01T00:00:00Z',
    fork: false,
    ...overrides,
  });

  const createFirstPage = (): GithubRepo[] =>
    Array.from({ length: 100 }, (_, index) =>
      createRepo({
        id: index + 1,
        name: `repo-${index + 1}`,
        stargazers_count: index,
      }),
    );

  const testError: ApiError = {
    kind: 'rate-limit',
    message: 'GitHub API rate limit reached.',
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<GithubApi>('GithubApi', ['getUser', 'getRepos']);

    api.getUser.and.returnValue(of(createUser()));
    api.getRepos.and.returnValue(of([createRepo()]));

    TestBed.configureTestingModule({
      providers: [
        ProfileStore,
        {
          provide: GithubApi,
          useValue: api,
        },
      ],
    });

    store = TestBed.inject(ProfileStore);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('should load the profile and first repository page', () => {
    const user = createUser();
    const repos = [createRepo()];

    api.getUser.and.returnValue(of(user));
    api.getRepos.and.returnValue(of(repos));

    store.load('octocat');

    expect(api.getUser).toHaveBeenCalledWith('octocat');
    expect(api.getRepos).toHaveBeenCalledWith('octocat', 1);

    expect(store.profile()).toEqual({
      status: 'success',
      data: user,
    });

    expect(store.repos()).toEqual({
      status: 'success',
      data: repos,
    });
  });

  it('should ignore an empty username', () => {
    store.load('   ');

    expect(api.getUser).not.toHaveBeenCalled();
    expect(api.getRepos).not.toHaveBeenCalled();

    expect(store.profile()).toEqual({
      status: 'idle',
    });
  });

  it('should cache profile and repositories', () => {
    store.load('octocat');
    store.load('octocat');

    expect(api.getUser).toHaveBeenCalledTimes(1);
    expect(api.getRepos).toHaveBeenCalledTimes(1);
  });

  it('should use cached data regardless of username casing', () => {
    store.load('octocat');
    store.cancel();

    store.load('OCTOCAT');

    expect(api.getUser).toHaveBeenCalledTimes(1);
    expect(api.getRepos).toHaveBeenCalledTimes(1);

    expect(store.profile()?.status).toBe('success');
    expect(store.repos()?.status).toBe('success');
  });

  it('should load and append the next repository page', () => {
    const firstPage = createFirstPage();
    const secondPage = [
      createRepo({
        id: 101,
        name: 'repo-101',
      }),
    ];

    api.getRepos.and.returnValues(of(firstPage), of(secondPage));

    store.load('octocat');

    expect(store.hasMoreRepos()).toBeTrue();

    store.loadMoreRepos();

    expect(api.getRepos).toHaveBeenCalledWith('octocat', 2);
    expect(store.repos()).toEqual({
      status: 'success',
      data: [...firstPage, ...secondPage],
    });

    expect(store.hasMoreRepos()).toBeFalse();
    expect(store.loadingMoreRepos()).toBeFalse();
  });

  it('should not request more repositories when there are no more pages', () => {
    store.load('octocat');

    expect(store.hasMoreRepos()).toBeFalse();

    store.loadMoreRepos();

    expect(api.getRepos).toHaveBeenCalledTimes(1);
  });

  it('should prevent duplicate pagination requests', () => {
    const firstPage = createFirstPage();
    const pendingPage = new Subject<GithubRepo[]>();

    api.getRepos.and.returnValues(of(firstPage), pendingPage.asObservable());

    store.load('octocat');

    store.loadMoreRepos();

    expect(store.loadingMoreRepos()).toBeTrue();

    // Attempt another request while page 2 is still loading.
    store.loadMoreRepos();

    expect(api.getRepos).toHaveBeenCalledTimes(2);

    pendingPage.next([
      createRepo({
        id: 101,
        name: 'repo-101',
      }),
    ]);

    pendingPage.complete();

    expect(store.loadingMoreRepos()).toBeFalse();

    const state = store.repos();

    expect(state.status).toBe('success');

    if (state.status === 'success') {
      expect(state.data.length).toBe(101);
    }
  });

  it('should sort repositories by stars in descending order by default', () => {
    const repos = [
      createRepo({ id: 1, stargazers_count: 5 }),
      createRepo({ id: 2, stargazers_count: 20 }),
      createRepo({ id: 3, stargazers_count: 10 }),
    ];

    api.getRepos.and.returnValue(of(repos));

    store.load('octocat');

    expect(store.sortedRepos().map((repo) => repo.id)).toEqual([2, 3, 1]);
  });

  it('should sort repositories in ascending order when toggled', () => {
    const repos = [
      createRepo({ id: 1, stargazers_count: 5 }),
      createRepo({ id: 2, stargazers_count: 20 }),
      createRepo({ id: 3, stargazers_count: 10 }),
    ];

    api.getRepos.and.returnValue(of(repos));

    store.load('octocat');
    store.toggleSortDirection();

    expect(store.sortDir()).toBe('asc');

    expect(store.sortedRepos().map((repo) => repo.id)).toEqual([1, 3, 2]);
  });

  it('should handle profile errors and retry successfully', () => {
    const user = createUser();

    api.getUser.and.returnValues(
      throwError(() => testError),
      of(user),
    );

    store.load('octocat');

    expect(store.profile()).toEqual({
      status: 'error',
      ...testError,
    });

    store.retryProfile();

    expect(api.getUser).toHaveBeenCalledTimes(2);

    expect(store.profile()).toEqual({
      status: 'success',
      data: user,
    });
  });

  it('should handle repository errors and retry successfully', () => {
    const repos = [createRepo()];

    api.getRepos.and.returnValues(
      throwError(() => testError),
      of(repos),
    );

    store.load('octocat');

    expect(store.repos()).toEqual({
      status: 'error',
      ...testError,
    });

    store.retryRepos();

    expect(api.getRepos).toHaveBeenCalledTimes(2);

    expect(store.repos()).toEqual({
      status: 'success',
      data: repos,
    });
  });

  it('should retry a failed pagination request', () => {
    const firstPage = createFirstPage();
    const secondPage = [
      createRepo({
        id: 101,
        name: 'repo-101',
      }),
    ];

    api.getRepos.and.returnValues(
      of(firstPage),
      throwError(() => testError),
      of(secondPage),
    );

    store.load('octocat');
    store.loadMoreRepos();

    expect(store.loadMoreError()).toEqual(testError);
    expect(store.loadingMoreRepos()).toBeFalse();

    store.loadMoreRepos();

    expect(api.getRepos).toHaveBeenCalledTimes(3);

    expect(store.repos()).toEqual({
      status: 'success',
      data: [...firstPage, ...secondPage],
    });

    expect(store.loadMoreError()).toBeNull();
  });

  it('should reset its state when cancelled', () => {
    store.load('octocat');

    store.cancel();

    expect(store.profile()).toEqual({
      status: 'idle',
    });

    expect(store.repos()).toEqual({
      status: 'idle',
    });

    expect(store.loadingMoreRepos()).toBeFalse();
    expect(store.hasMoreRepos()).toBeFalse();
    expect(store.loadMoreError()).toBeNull();

    store.loadMoreRepos();

    expect(api.getRepos).toHaveBeenCalledTimes(1);
  });

  it('should restore cached repositories and pagination state', () => {
    const firstPage = createFirstPage();
    const secondPage = [
      createRepo({
        id: 101,
        name: 'repo-101',
      }),
    ];

    api.getRepos.and.returnValues(of(firstPage), of(secondPage));

    store.load('octocat');
    store.loadMoreRepos();

    expect(store.repos()).toEqual({
      status: 'success',
      data: [...firstPage, ...secondPage],
    });

    store.cancel();
    store.load('octocat');

    expect(api.getRepos).toHaveBeenCalledTimes(2);

    expect(store.repos()).toEqual({
      status: 'success',
      data: [...firstPage, ...secondPage],
    });

    expect(store.hasMoreRepos()).toBeFalse();
  });

  it('should return an empty array when repositories are not loaded', () => {
    expect(store.sortedRepos()).toEqual([]);
  });

  it('should not retry the profile when no username is loaded', () => {
    store.retryProfile();

    expect(api.getUser).not.toHaveBeenCalled();
  });

  it('should not retry repositories when no username is loaded', () => {
    store.retryRepos();

    expect(api.getRepos).not.toHaveBeenCalled();
  });

  it('should toggle sorting back to descending order', () => {
    store.toggleSortDirection();

    expect(store.sortDir()).toBe('asc');

    store.toggleSortDirection();

    expect(store.sortDir()).toBe('desc');
  });

  it('should normalize a regular Error returned by the API', () => {
    api.getUser.and.returnValue(
      throwError(() => new Error('Unexpected failure')),
    );

    store.load('octocat');

    expect(store.profile()).toEqual({
      status: 'error',
      kind: 'unknown',
      message: 'Something went wrong.',
    });
  });

  it('should preserve a network ApiError returned by the API', () => {
    const networkError = {
      kind: 'network',
      message: 'Network unavailable.',
    } as const;

    api.getUser.and.returnValue(throwError(() => networkError));

    store.load('octocat');

    expect(store.profile()).toEqual({
      status: 'error',
      ...networkError,
    });
  });

  it('should preserve an unknown ApiError returned by the API', () => {
    const unknownError = {
      kind: 'unknown',
      message: 'Unexpected server response.',
    } as const;

    api.getUser.and.returnValue(throwError(() => unknownError));

    store.load('octocat');

    expect(store.profile()).toEqual({
      status: 'error',
      ...unknownError,
    });
  });

  it('should normalize a null API error', () => {
    api.getUser.and.returnValue(throwError(() => null));

    store.load('octocat');

    expect(store.profile()).toEqual({
      status: 'error',
      kind: 'unknown',
      message: 'Something went wrong.',
    });
  });

  it('should normalize a primitive API error', () => {
    api.getUser.and.returnValue(throwError(() => 'Unexpected failure'));

    store.load('octocat');

    expect(store.profile()).toEqual({
      status: 'error',
      kind: 'unknown',
      message: 'Something went wrong.',
    });
  });
});
