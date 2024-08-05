import { Component, computed, inject } from '@angular/core';

import { SongComponent } from './song/song.component';
import { SearchComponent } from './search/search.component';
import { SearchStatus } from './models/song.model';
import { RouterLink } from '@angular/router';
import { SongsService } from './services/songs.service';

@Component({
  selector: 'app-songs',
  standalone: true,
  imports: [SongComponent, SearchComponent, RouterLink],
  templateUrl: './songs.component.html',
  styleUrl: './songs.component.scss',
})
export class SongsComponent {
  private songsService = inject(SongsService);
  songs = computed(() => this.songsService.songs$());
  status = computed(() => this.songsService.status$());

  searchStatus = SearchStatus;
  constructor() {}
}
