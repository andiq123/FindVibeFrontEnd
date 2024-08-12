import { Component, computed, effect, input } from '@angular/core';
import { SongComponent } from './song/song.component';
import { SearchComponent } from './search/search.component';
import { SearchStatus } from './models/song.model';
import { Router, RouterLink } from '@angular/router';
import { SongsService } from './services/songs.service';
import { SettingsService } from '../services/settings.service';
import { PlayerService } from '../services/player.service';
import { PlaylistService } from '../services/playlist.service';

@Component({
  selector: 'app-songs',
  standalone: true,
  imports: [SongComponent, SearchComponent, RouterLink],
  templateUrl: './songs.component.html',
  styleUrl: './songs.component.scss',
})
export class SongsComponent {
  query = input<string>('');

  songs = computed(() => this.songsService.songs$());
  status = computed(() => this.songsService.status$());
  isCheckedServer = computed(() => this.settingsService.isCheckedServer$());

  searchStatus = SearchStatus;

  constructor(
    private router: Router,
    private songsService: SongsService,
    private settingsService: SettingsService,
    private playlistService: PlaylistService
  ) {
    effect(() => {
      if (this.settingsService.isServerDown$()) {
        this.router.navigate(['/library']);
      }
    });
  }

  onChangePlaylist() {
    this.playlistService.setCurrentPlaylist(this.songs());
  }
}
