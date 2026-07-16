import {
  Component,
  input,
  output,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { Song, sameSong, sourceHost } from "../../core/models/song.model";
import { PlayerStatus } from "../../features/player/models/player.model";
import { PlayerButtonComponent } from "../player-button/player-button.component";
import { MovingTitleComponent } from "../moving-title/moving-title.component";
import { NgTemplateOutlet } from "@angular/common";
import { FavoriteButtonComponent } from "../favorite-button/favorite-button.component";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { OfflineStorageService } from "../../features/library/services/offline-storage.service";
import { DragAndDropDirective } from "../../features/search/directives/drag-and-drop.directive";
import { PlayerService } from "../../core/services/player.service";
import { PlaylistService } from "../../core/services/playlist.service";
import { SettingsService } from "../../core/services/settings.service";
import {
  faForward,
  faGripVertical,
  faListUl,
  faTriangleExclamation,
} from "../icons";
@Component({
  selector: "app-song",
  standalone: true,
  imports: [
    PlayerButtonComponent,
    MovingTitleComponent,
    FavoriteButtonComponent,
    FontAwesomeModule,
    DragAndDropDirective,
    NgTemplateOutlet,
  ],
  templateUrl: "./song.component.html",
  styleUrl: "./song.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongComponent {
  private playerService = inject(PlayerService);
  private playlistService = inject(PlaylistService);
  private offlineStorageService = inject(OfflineStorageService);
  private settingsService = inject(SettingsService);
  song = input.required<Song>();
  allowReorder = input<boolean>(false);
  /** Vault select-to-reorder — checkbox replaces drag; row tap toggles. */
  selectMode = input(false);
  selected = input(false);
  loading = input<boolean>(false);
  reorder = output<{ from: string; to: string }>();
  playlistChange = output<void>();
  toggleSelect = output<string>();
  isActive = () => sameSong(this.playlistService.currentSong(), this.song());
  status = () =>
    this.isActive() ? this.playerService.status() : PlayerStatus.Paused;
  isAvailableOffline = () =>
    this.offlineStorageService
      .availableOfflineSongIds()
      .includes(this.song().id);
  isUnavailable = () =>
    this.settingsService.isNavigatorOffline() && !this.isAvailableOffline();
  isError = () => this.status() === PlayerStatus.Error;
  faTriangleExclamation = faTriangleExclamation;
  faForward = faForward;
  faListUl = faListUl;
  faGripVertical = faGripVertical;
  sourceLabel = () => sourceHost(this.song().provider);
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
    if (this.selectMode()) {
      this.toggleSelect.emit(this.song().id);
      return;
    }
    if (this.isUnavailable()) return;
    if (this.status() === PlayerStatus.Playing) {
      await this.pause();
    } else {
      await this.play();
    }
  }
  onSelectToggle(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.toggleSelect.emit(this.song().id);
  }
  emitReorder(data: { from: string; to: string }) {
    this.reorder.emit(data);
  }
  /** Keep row play/pause from firing when tapping the action cluster. */
  guardActions(event: Event) {
    event.stopPropagation();
  }
  playNext(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.playerService.playNext(this.song());
  }
  addToQueue(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.playerService.addToQueue(this.song());
  }
}
