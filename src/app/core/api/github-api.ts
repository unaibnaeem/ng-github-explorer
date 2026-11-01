import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { GithubUser, GithubRepo } from './github-api.types';

@Injectable({
  providedIn: 'root',
})
export class GithubApi {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = 'https://api.github.com';

  getUser(username: string): Observable<GithubUser> {
    return this.http.get<GithubUser>(
      `${this.baseUrl}/users/${encodeURIComponent(username)}`,
    );
  }

  getRepos(username: string, page: number): Observable<GithubRepo[]> {
    const params = new HttpParams().set('per_page', 100).set('page', page);

    return this.http.get<GithubRepo[]>(
      `${this.baseUrl}/users/${encodeURIComponent(username)}/repos`,
      { params },
    );
  }
}
