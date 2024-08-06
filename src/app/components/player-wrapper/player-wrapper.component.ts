import { Component, effect, OnInit, Signal, signal } from '@angular/core';
import { MiniPlayerComponent } from './mini-player/mini-player.component';
import { FullPlayerComponent } from './full-player/full-player.component';
import { PlayerService } from './player.service';
import { Song } from '../../songs/models/song.model';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-player-wrapper',
  standalone: true,
  imports: [MiniPlayerComponent, FullPlayerComponent],
  templateUrl: './player-wrapper.component.html',
  styleUrl: './player-wrapper.component.scss',
})
export class PlayerWrapperComponent implements OnInit {
  isMiniPlayer!: Signal<boolean>;

  song!: Signal<Song | null>;

  constructor(
    private playerService: PlayerService,
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.song = this.playerService.song$;
    this.isMiniPlayer = this.settingsService.isMiniPlayer$;
    this.playerService.registerEvents();
  }

  onToggleSize() {
    this.settingsService.toggleMiniPlayer();
  }
}
