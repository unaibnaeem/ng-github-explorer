import { Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-search-bar',
  imports: [],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.css',
})
export class SearchBar {
  readonly searched = output<string>();

  readonly query = signal('');

  onInput(event: Event): void {
    const input = event.target;

    if (input instanceof HTMLInputElement) {
      this.query.set(input.value);
    }
  }

  submit(event: Event): void {
    event.preventDefault();

    const username = this.query().trim();

    if (!username) {
      return;
    }

    this.searched.emit(username);
  }
}
