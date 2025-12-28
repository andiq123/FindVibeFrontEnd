import { Routes } from '@angular/router';
import { SearchPageComponent } from './features/search/search-page.component';
import { offlineGuard } from './shared/guards/offline.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'songs',
    pathMatch: 'full',
  },
  {
    path: 'songs',
    component: SearchPageComponent,
    canActivate: [offlineGuard],
  },
  {
    path: 'songs/:query',
    component: SearchPageComponent,
    canActivate: [offlineGuard],
  },
  {
    path: 'library',
    loadComponent: () =>
      import('./features/library/library.component').then((c) => c.LibraryComponent),
  },
  {
    path: 'recent',
    loadComponent: () =>
      import('./features/recent/recent.component').then((c) => c.RecentComponent),
  },
];
