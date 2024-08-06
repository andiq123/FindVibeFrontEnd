import { Component, computed, effect, inject, OnInit } from '@angular/core';

import { SongComponent } from './song/song.component';
import { SearchComponent } from './search/search.component';
import { SearchStatus } from './models/song.model';
import { Router, RouterLink } from '@angular/router';
import { SongsService } from './services/songs.service';
import { SettingsService } from '../services/settings.service';

@Component({
  selector: 'app-songs',
  standalone: true,
  imports: [SongComponent, SearchComponent, RouterLink],
  templateUrl: './songs.component.html',
  styleUrl: './songs.component.scss',
})
export class SongsComponent {
  private songsService = inject(SongsService);
  private settingsService = inject(SettingsService);

  songs = computed(() => this.songsService.songs$());
  status = computed(() => this.songsService.status$());
  isCheckedServer = computed(() => this.settingsService.isCheckedServer$());

  searchStatus = SearchStatus;
  constructor(private router: Router) {
    effect(() => {
      if (this.settingsService.isServerDown$()) {
        this.router.navigate(['/library']);
      }
    });
  }
}
