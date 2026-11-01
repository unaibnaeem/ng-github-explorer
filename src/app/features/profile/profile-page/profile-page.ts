import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { ProfileStore } from '../profile-store';

@Component({
  selector: 'app-profile-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage {
  readonly username = input.required<string>();

  private readonly store = inject(ProfileStore);
  private readonly destroyRef = inject(DestroyRef);

  private readonly loadMoreSentinel =
    viewChild<ElementRef<HTMLDivElement>>('loadMoreSentinel');

  readonly profile = this.store.profile;
  readonly repos = this.store.repos;
  readonly sortedRepos = this.store.sortedRepos;
  readonly sortDir = this.store.sortDir;

  readonly loadingMoreRepos = this.store.loadingMoreRepos;
  readonly hasMoreRepos = this.store.hasMoreRepos;
  readonly loadMoreError = this.store.loadMoreError;

  constructor() {
    afterNextRender(() => {
      const sentinel = this.loadMoreSentinel()?.nativeElement;

      if (!sentinel || typeof IntersectionObserver === 'undefined') {
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            this.store.loadMoreRepos();
          }
        },
        {
          rootMargin: '300px 0px',
        },
      );

      observer.observe(sentinel);

      this.destroyRef.onDestroy(() => {
        observer.disconnect();
      });
    });

    effect((onCleanup) => {
      const username = this.username().trim();

      if (!username) {
        return;
      }

      this.store.load(username);

      onCleanup(() => {
        this.store.cancel();
      });
    });
  }

  retryProfile(): void {
    this.store.retryProfile();
  }

  retryRepos(): void {
    this.store.retryRepos();
  }

  loadMoreRepos(): void {
    this.store.loadMoreRepos();
  }

  toggleSortDirection(): void {
    this.store.toggleSortDirection();
  }
}
