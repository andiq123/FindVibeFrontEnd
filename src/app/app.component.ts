import { Component } from '@angular/core';
import { SongsComponent } from './songs/songs.component';
import { SearchComponent } from './songs/search/search.component';
import { PlayerWrapperComponent } from './player-wrapper/player-wrapper.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SongsComponent, SearchComponent, PlayerWrapperComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor() {}
}
