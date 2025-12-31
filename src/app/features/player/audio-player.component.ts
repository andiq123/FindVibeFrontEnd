import {
  Component,
  computed,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";

import { SettingsService } from "../../core/services/settings.service";
import { PlayerService } from "../../core/services/player.service";
import { MiniPlayerComponent } from "./mini-player/mini-player.component";
import { FullPlayerComponent } from "./full-player/full-player.component";
import { PlaylistService } from "../../core/services/playlist.service";

@Component({
  selector: "app-audio-player",
  imports: [MiniPlayerComponent, FullPlayerComponent],
  templateUrl: "./audio-player.component.html",
  styleUrl: "./audio-player.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AudioPlayerComponent {
  private playerService = inject(PlayerService);
  private playlistService = inject(PlaylistService);
  private settingsService = inject(SettingsService);

  isMiniPlayer = computed(() => this.settingsService.isMiniPlayer());
  song = computed(() => this.playlistService.currentSong());
  progress = computed(() => this.playerService.progress());

  onToggleSize() {
    this.settingsService.toggleMiniPlayer();
  }
}
