import { Routes } from '@angular/router';
import { SongsComponent } from './songs/songs.component';

export const routes: Routes = [
  { path: '', redirectTo: 'songs', pathMatch: 'full' },
  { path: 'songs', component: SongsComponent },
  {
    path: 'library',
    loadComponent: () =>
      import('./library/library.component').then((c) => c.LibraryComponent),
  },
];
