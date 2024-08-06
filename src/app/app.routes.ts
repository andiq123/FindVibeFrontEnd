import { Routes } from '@angular/router';
import { SongsComponent } from './songs/songs.component';
import { offlineGuard } from './shared/offline.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'songs', pathMatch: 'full' },
  { path: 'songs', component: SongsComponent, canActivate: [offlineGuard] },
  {
    path: 'library',
    loadComponent: () =>
      import('./library/library.component').then((c) => c.LibraryComponent),
  },
];
