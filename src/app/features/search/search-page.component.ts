import { Component, computed, effect, input, inject } from '@angular/core';
import { SongComponent } from '../../shared/song/song.component';
import { SearchBarComponent } from './search-bar/search-bar.component';
import { SearchStatus } from '../../core/models/song.model';
import { Router } from '@angular/router';
import { SearchService } from './services/search.service';
import { PullToRefreshDirective } from '../../shared/directives/pull-to-refresh.directive';
import { SettingsService } from '../../core/services/settings.service';
import { PlayerService } from '../../core/services/player.service';
import { PlaylistService } from '../../core/services/playlist.service';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass, faTriangleExclamation, faWaveSquare, faMusic } from '@fortawesome/free-solid-svg-icons';

@Component({
    selector: 'app-search-page',
    imports: [SongComponent, SearchBarComponent, FontAwesomeModule, PullToRefreshDirective],
    templateUrl: './search-page.component.html',
    styleUrl: './search-page.component.scss'
})
export class SearchPageComponent {
  private router = inject(Router);
  private songsService = inject(SearchService);
  private settingsService = inject(SettingsService);
  private playlistService = inject(PlaylistService);
  public playerService = inject(PlayerService);

  query = input<string>('');

  songs = computed(() => this.songsService.songs());
  status = computed(() => this.songsService.status());
  isCheckedServer = computed(() => this.settingsService.isCheckedServer());

  searchStatus = SearchStatus;

  faMagnifyingGlass = faMagnifyingGlass;
  faTriangleExclamation = faTriangleExclamation;
  faWaveSquare = faWaveSquare;
  faMusic = faMusic;

  dummySong = { id: '', artist: '', title: '', image: '', link: '', order: 0 };

  constructor() {
    effect(() => {
      if (this.settingsService.isServerDown() && this.router.url !== '/library') {
        this.router.navigate(['/library']);
      }
    });
  }

  onChangePlaylist() {
    this.playlistService.setCurrentPlaylist(this.songs());
  }

  handleRefresh() {
    const q = this.query();
    if (q) {
      this.songsService.searchSongs(q).subscribe();
    }
  }
}
