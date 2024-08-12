import { Routes } from '@angular/router';
import { SongsComponent } from './songs/songs.component';
import { offlineGuard } from './shared/guards/offline.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'songs',
    pathMatch: 'full',
  },
  {
    path: 'songs',
    component: SongsComponent,
    canActivate: [offlineGuard],
  },
  {
    path: 'songs/:query',
    component: SongsComponent,
    canActivate: [offlineGuard],
  },
  {
    path: 'library',
    loadComponent: () =>
      import('./library/library.component').then((c) => c.LibraryComponent),
  },
  {
    path: 'recent',
    loadComponent: () =>
      import('./recent/recent.component').then((c) => c.RecentComponent),
  },
];
