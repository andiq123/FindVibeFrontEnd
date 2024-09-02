import { Component, computed, OnInit } from '@angular/core';

import { SettingsService } from '../../services/settings.service';
import { PlayerService } from '../../services/player.service';
import { MiniPlayerComponent } from './mini-player/mini-player.component';
import { FullPlayerComponent } from './full-player/full-player.component';
import { RemoteService } from '../../services/remote.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { PlayerStatus } from './models/player.model';
import { PlaylistService } from '../../services/playlist.service';

@Component({
  selector: 'app-player-wrapper',
  standalone: true,
  imports: [MiniPlayerComponent, FullPlayerComponent],
  templateUrl: './player-wrapper.component.html',
  styleUrl: './player-wrapper.component.scss',
})
export class PlayerWrapperComponent implements OnInit {
  isMiniPlayer = computed(() => this.settingsService.isMiniPlayer$());
  song = computed(() => this.playlistService.currentSong());
  status = computed(() => this.playerService.status$());
  statusObservable = toObservable(this.status);

  constructor(
    private playerService: PlayerService,
    private playlistService:PlaylistService,
    private settingsService: SettingsService,
    private remoteService: RemoteService
  ) {}

  ngOnInit(): void {
    this.playerService.registerEvents();
    this.statusObservable.subscribe(async (status) => {
      if (status === PlayerStatus.Ended) {
        await this.nextSong();
      }
    });
  }

  async nextSong() {
    const song = await this.playerService.setNextSong();
    if (song) {
      await this.remoteService.setSong(song);
    }
  }

  onToggleSize() {
    this.settingsService.toggleMiniPlayer();
  }
}
