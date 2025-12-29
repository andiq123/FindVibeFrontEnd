import { Component, computed, effect, input, inject, ChangeDetectionStrategy, signal, AfterViewInit } from '@angular/core';
import { SongComponent } from '../../shared/song/song.component';
import { SearchBarComponent } from './search-bar/search-bar.component';
import { SearchStatus } from '../../core/models/song.model';
import { Router } from '@angular/router';
import { SearchService } from './services/search.service';
import { SettingsService } from '../../core/services/settings.service';
import { PlayerService } from '../../core/services/player.service';
import { PlaylistService } from '../../core/services/playlist.service';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass, faTriangleExclamation, faWaveSquare, faMusic } from '@fortawesome/free-solid-svg-icons';

@Component({
    selector: 'app-search-page',
    imports: [SongComponent, SearchBarComponent, FontAwesomeModule, EmptyStateComponent],
    templateUrl: './search-page.component.html',
    styleUrl: './search-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchPageComponent implements AfterViewInit {
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
  hasAnimated = signal(false);
  shouldAnimate = computed(() => !this.hasAnimated() && this.status() !== SearchStatus.None);

  faMagnifyingGlass = faMagnifyingGlass;
  faTriangleExclamation = faTriangleExclamation;
  faWaveSquare = faWaveSquare;
  faMusic = faMusic;

  readonly dummySong = { id: '', artist: '', title: '', image: '', link: '', order: 0, isFavorite: false };

  constructor() {
    effect(() => {
      if (this.settingsService.isServerDown() && this.router.url !== '/library') {
        this.router.navigate(['/library']);
      }
    });

    effect(() => {
      if (this.status() === SearchStatus.Finished && this.songs().length > 0) {
        this.hasAnimated.set(true);
      }
    });
  }

  ngAfterViewInit() {
    if (this.status() === SearchStatus.Finished && this.songs().length > 0) {
      this.hasAnimated.set(true);
    }
  }

  onChangePlaylist() {
    this.playlistService.setCurrentPlaylist(this.songs());
  }
}
