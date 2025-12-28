import { Component, computed, OnInit, inject } from '@angular/core';

import { SettingsService } from '../../core/services/settings.service';
import { PlayerService } from '../../core/services/player.service';
import { MiniPlayerComponent } from './mini-player/mini-player.component';
import { FullPlayerComponent } from './full-player/full-player.component';
import { toObservable } from '@angular/core/rxjs-interop';
import { PlayerStatus } from './models/player.model';
import { PlaylistService } from '../../core/services/playlist.service';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [MiniPlayerComponent, FullPlayerComponent],
  templateUrl: './audio-player.component.html',
  styleUrl: './audio-player.component.scss',
})
export class AudioPlayerComponent implements OnInit {
  private playerService = inject(PlayerService);
  private playlistService = inject(PlaylistService);
  private settingsService = inject(SettingsService);

  isMiniPlayer = computed(() => this.settingsService.isMiniPlayer());
  song = computed(() => this.playlistService.currentSong());
  status = computed(() => this.playerService.status());
  statusObservable = toObservable(this.status);

  ngOnInit(): void {
    this.statusObservable.subscribe(async (status) => {
      if (status === PlayerStatus.Ended) {
        await this.nextSong();
      }
    });
  }

  async nextSong() {
    await this.playerService.setNextSong();
  }

  onToggleSize() {
    this.settingsService.toggleMiniPlayer();
  }
}
