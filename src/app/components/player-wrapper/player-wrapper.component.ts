import { Component, computed, OnInit } from '@angular/core';

import { SettingsService } from '../../services/settings.service';
import { PlayerService } from '../../services/player.service';
import { MiniPlayerComponent } from './mini-player/mini-player.component';
import { FullPlayerComponent } from './full-player/full-player.component';

@Component({
  selector: 'app-player-wrapper',
  standalone: true,
  imports: [MiniPlayerComponent, FullPlayerComponent],
  templateUrl: './player-wrapper.component.html',
  styleUrl: './player-wrapper.component.scss',
})
export class PlayerWrapperComponent implements OnInit {
  isMiniPlayer = computed(() => this.settingsService.isMiniPlayer$());
  song = computed(() => this.playerService.song$());

  constructor(
    private playerService: PlayerService,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.playerService.registerEvents();
  }

  onToggleSize() {
    this.settingsService.toggleMiniPlayer();
  }
}
