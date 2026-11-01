import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/search/search-page/search-page').then(
        (m) => m.SearchPage,
      ),
    title: 'GitHub Profile Explorer',
  },
  {
    path: 'u/:username',
    loadComponent: () =>
      import('./features/profile/profile-page/profile-page').then(
        (m) => m.ProfilePage,
      ),
    title: 'GitHub Profile',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
