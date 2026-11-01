import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { SearchBar } from './features/search/search-bar/search-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, SearchBar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly router = inject(Router);

  readonly isDark = signal(
    localStorage.getItem('github-explorer-theme') === 'dark',
  );

  onSearch(username: string): void {
    const normalized = username.trim();

    if (!normalized) {
      return;
    }

    void this.router.navigate(['/u', normalized]);
  }

  toggleTheme(): void {
    this.isDark.update((dark) => {
      const next = !dark;

      localStorage.setItem('github-explorer-theme', next ? 'dark' : 'light');

      return next;
    });
  }
}
