import {
  Component,
  input,
  output,
  inject,
  ChangeDetectionStrategy,
  OnDestroy,
} from "@angular/core";
import { Song } from "../../core/models/song.model";
import { PlayerStatus } from "../../features/player/models/player.model";
import { PlayerButtonComponent } from "../player-button/player-button.component";
import { MovingTitleComponent } from "../moving-title/moving-title.component";
import { NgOptimizedImage, NgTemplateOutlet } from "@angular/common";
import { FavoriteButtonComponent } from "../favorite-button/favorite-button.component";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { OfflineStorageService } from "../../features/library/services/offline-storage.service";
import { DragAndDropDirective } from "../../features/search/directives/drag-and-drop.directive";
import { PlayerService } from "../../core/services/player.service";
import { PlaylistService } from "../../core/services/playlist.service";
import { SettingsService } from "../../core/services/settings.service";
import { faCloudArrowDown, faTriangleExclamation } from "../icons";
@Component({
  selector: "app-song",
  standalone: true,
  imports: [
    PlayerButtonComponent,
    MovingTitleComponent,
    NgOptimizedImage,
    FavoriteButtonComponent,
    FontAwesomeModule,
    DragAndDropDirective,
    NgTemplateOutlet,
  ],
  templateUrl: "./song.component.html",
  styleUrl: "./song.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongComponent implements OnDestroy {
  private playerService = inject(PlayerService);
  private playlistService = inject(PlaylistService);
  private offlineStorageService = inject(OfflineStorageService);
  private settingsService = inject(SettingsService);
  song = input.required<Song>();
  allowReorder = input<boolean>(false);
  loading = input<boolean>(false);
  compact = input<boolean>(false);
  showOfflineIndicator = input<boolean>(true);
  isFavoritePage = input<boolean>(false);
  reorder = output<{ from: string; to: string }>();
  playlistChange = output<void>();
  ngOnDestroy() {
  }
  isActive = () => this.playlistService.currentSong()?.link === this.song().link;
  status = () => this.isActive() ? this.playerService.status() : PlayerStatus.Paused;
  isDownloadingOffline = () => this.offlineStorageService.currentLoadingDownloadSongIds().includes(this.song().id);
  isAvailableOffline = () => this.offlineStorageService.availableOfflineSongIds().includes(this.song().id);
  isUnavailable = () => this.settingsService.isOffline() && !this.isAvailableOffline();
  isError = () => this.status() === PlayerStatus.Error;
  playerStatus = PlayerStatus;
  faCloudArrowDown = faCloudArrowDown;
  faTriangleExclamation = faTriangleExclamation;
  async play() {
    if (this.isActive()) {
      await this.playerService.play();
      return;
    }
    this.playlistChange.emit();
    await this.playerService.setSong(this.song());
  }
  async pause() {
    this.playerService.pause();
  }
  async playOrPause() {
    if (this.isUnavailable()) return;
    const currentStatus = this.status();
    if (currentStatus === PlayerStatus.Paused) {
      await this.play();
    } else {
      await this.pause();
    }
  }
  emitReorder(data: { from: string; to: string }) {
    this.reorder.emit(data);
  }
}
