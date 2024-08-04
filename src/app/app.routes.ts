import {Routes} from '@angular/router';
import {SongsComponent} from "./songs/songs.component";
import {LibraryComponent} from "./library/library.component";

export const routes: Routes = [
  {path: '', redirectTo: 'songs', pathMatch: 'full'},
  {path: 'songs', component: SongsComponent},
  {path: 'library', component: LibraryComponent}
];
