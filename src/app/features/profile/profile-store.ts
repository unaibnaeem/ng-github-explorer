import {
  DestroyRef,
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  EMPTY,
  Subject,
  catchError,
  map,
  of,
  startWith,
  tap,
  switchMap,
} from 'rxjs';

import { GithubApi } from '../../core/api/github-api';
import { GithubRepo, GithubUser } from '../../core/api/github-api.types';

import { ApiError, toApiError } from '../../core/errors/api-error';

import { LoadState } from '../../shared/models/load-state';

type ProfileRequest = {
  username: string;
  force: boolean;
} | null;

interface RepoRequest {
  username: string;
  page: number;
  append: boolean;
}

type RepoResult =
  | {
      request: RepoRequest;
      repos: GithubRepo[];
    }
  | {
      request: RepoRequest;
      error: ApiError;
    };

@Injectable({
  providedIn: 'root',
})
export class ProfileStore {
  private readonly api = inject(GithubApi);
  private readonly destroyRef = inject(DestroyRef);

  private readonly profileRequests$ = new Subject<ProfileRequest>();

  private readonly reposRequests$ = new Subject<RepoRequest | null>();

  private readonly PAGE_SIZE = 100;

  private currentUsername = '';
  private currentRepoPage = 0;

  private readonly profileCache = new Map<string, GithubUser>();

  private readonly reposCache = new Map<string, GithubRepo[]>();
  private readonly reposPageCache = new Map<string, number>();
  private readonly reposHasMoreCache = new Map<string, boolean>();

  readonly profile = signal<LoadState<GithubUser>>({
    status: 'idle',
  });

  readonly repos = signal<LoadState<GithubRepo[]>>({
    status: 'idle',
  });

  readonly loadingMoreRepos = signal(false);
  readonly hasMoreRepos = signal(false);
  readonly loadMoreError = signal<ApiError | null>(null);

  readonly sortDir = signal<'desc' | 'asc'>('desc');

  readonly sortedRepos = computed(() => {
    const state = this.repos();

    if (state.status !== 'success') {
      return [];
    }

    const direction = this.sortDir() === 'desc' ? -1 : 1;

    return [...state.data].sort(
      (a, b) => direction * (a.stargazers_count - b.stargazers_count),
    );
  });

  constructor() {
    this.profileRequests$
      .pipe(
        switchMap((request) => {
          if (!request) {
            return EMPTY;
          }

          const cacheKey = request.username.toLowerCase();

          const cached = request.force
            ? undefined
            : this.profileCache.get(cacheKey);

          if (cached) {
            return of<LoadState<GithubUser>>({
              status: 'success',
              data: cached,
            });
          }

          return this.api.getUser(request.username).pipe(
            tap((user) => {
              this.profileCache.set(cacheKey, user);
            }),

            map((user): LoadState<GithubUser> => ({
              status: 'success',
              data: user,
            })),

            catchError((error: unknown) =>
              of(this.toErrorState<GithubUser>(error)),
            ),

            startWith({
              status: 'loading',
            } as LoadState<GithubUser>),
          );
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => {
        this.profile.set(state);
      });

    this.reposRequests$
      .pipe(
        switchMap((request) => {
          if (!request) {
            return EMPTY;
          }

          return this.api.getRepos(request.username, request.page).pipe(
            map((repos): RepoResult => ({
              request,
              repos,
            })),

            catchError((error: unknown) =>
              of<RepoResult>({
                request,
                error: this.normalizeApiError(error),
              }),
            ),
          );
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        const request = result.request;
        const cacheKey = request.username.toLowerCase();

        if ('error' in result) {
          if (request.append) {
            this.loadingMoreRepos.set(false);
            this.loadMoreError.set(result.error);
          } else {
            this.repos.set({
              status: 'error',
              ...result.error,
            });
          }

          return;
        }

        const currentState = this.repos();

        const previousRepos =
          request.append && currentState.status === 'success'
            ? currentState.data
            : [];

        const updatedRepos = request.append
          ? [...previousRepos, ...result.repos]
          : result.repos;

        this.repos.set({
          status: 'success',
          data: updatedRepos,
        });

        this.currentRepoPage = request.page;

        const hasMore = result.repos.length === this.PAGE_SIZE;

        this.hasMoreRepos.set(hasMore);
        this.loadingMoreRepos.set(false);
        this.loadMoreError.set(null);

        this.reposCache.set(cacheKey, updatedRepos);
        this.reposPageCache.set(cacheKey, request.page);
        this.reposHasMoreCache.set(cacheKey, hasMore);
      });
  }

  load(username: string): void {
    const normalized = username.trim();

    if (!normalized) {
      return;
    }

    this.currentUsername = normalized;

    this.profileRequests$.next({
      username: normalized,
      force: false,
    });

    const cacheKey = normalized.toLowerCase();

    const cachedRepos = this.reposCache.get(cacheKey);

    this.reposRequests$.next(null);

    this.loadMoreError.set(null);
    this.loadingMoreRepos.set(false);

    if (cachedRepos) {
      this.repos.set({
        status: 'success',
        data: cachedRepos,
      });

      this.currentRepoPage = this.reposPageCache.get(cacheKey) ?? 1;

      this.hasMoreRepos.set(this.reposHasMoreCache.get(cacheKey) ?? false);

      return;
    }

    this.currentRepoPage = 0;
    this.hasMoreRepos.set(false);

    this.repos.set({
      status: 'loading',
    });

    this.reposRequests$.next({
      username: normalized,
      page: 1,
      append: false,
    });
  }

  loadMoreRepos(): void {
    const state = this.repos();

    if (
      !this.currentUsername ||
      state.status !== 'success' ||
      !this.hasMoreRepos() ||
      this.loadingMoreRepos()
    ) {
      return;
    }

    this.loadMoreError.set(null);
    this.loadingMoreRepos.set(true);

    this.reposRequests$.next({
      username: this.currentUsername,
      page: this.currentRepoPage + 1,
      append: true,
    });
  }

  retryProfile(): void {
    if (!this.currentUsername) {
      return;
    }

    this.profileRequests$.next({
      username: this.currentUsername,
      force: true,
    });
  }

  retryRepos(): void {
    if (!this.currentUsername) {
      return;
    }

    const cacheKey = this.currentUsername.toLowerCase();

    this.reposCache.delete(cacheKey);
    this.reposPageCache.delete(cacheKey);
    this.reposHasMoreCache.delete(cacheKey);

    this.currentRepoPage = 0;

    this.hasMoreRepos.set(false);
    this.loadingMoreRepos.set(false);
    this.loadMoreError.set(null);

    this.repos.set({
      status: 'loading',
    });

    this.reposRequests$.next({
      username: this.currentUsername,
      page: 1,
      append: false,
    });
  }

  toggleSortDirection(): void {
    this.sortDir.update((direction) => (direction === 'desc' ? 'asc' : 'desc'));
  }

  cancel(): void {
    this.currentUsername = '';
    this.currentRepoPage = 0;

    this.profileRequests$.next(null);
    this.reposRequests$.next(null);

    this.profile.set({ status: 'idle' });
    this.repos.set({ status: 'idle' });

    this.loadingMoreRepos.set(false);
    this.hasMoreRepos.set(false);
    this.loadMoreError.set(null);
  }

  private normalizeApiError(error: unknown): ApiError {
    return this.isApiError(error) ? error : toApiError(error);
  }

  private toErrorState<T>(error: unknown): LoadState<T> {
    return {
      status: 'error',
      ...this.normalizeApiError(error),
    };
  }

  private isApiError(error: unknown): error is ApiError {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const candidate = error as Record<string, unknown>;

    const kind = candidate['kind'];

    return (
      typeof candidate['message'] === 'string' &&
      (kind === 'not-found' ||
        kind === 'rate-limit' ||
        kind === 'network' ||
        kind === 'unknown')
    );
  }
}
