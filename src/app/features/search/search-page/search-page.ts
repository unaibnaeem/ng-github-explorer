import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { SearchBar } from '../search-bar/search-bar';

@Component({
  selector: 'app-search-page',
  imports: [SearchBar],
  templateUrl: './search-page.html',
  styleUrl: './search-page.css',
})
export class SearchPage {
  private readonly router = inject(Router);

  readonly examples = ['torvalds', 'gaearon', 'sindresorhus'];

  search(username: string): void {
    const normalized = username.trim();

    if (!normalized) {
      return;
    }

    void this.router.navigate(['/u', normalized]);
  }
}
