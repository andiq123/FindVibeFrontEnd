import {
  Component,
  computed,
  effect,
  OnInit,
  Signal,
  signal,
} from '@angular/core';
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
