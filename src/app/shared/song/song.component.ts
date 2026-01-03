import {
  Component,
  computed,
  input,
  output,
  inject,
  signal,
  ChangeDetectionStrategy,
  effect,
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
import { SettingsService } from "../../core/services/settings.service";
import { faCloudArrowDown, faTriangleExclamation } from "../icons";
import { createImageLoader, ImageLoader } from "../utils/image-loader.util";

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

  private imageLoader!: ImageLoader;
  imageLoading = signal(true);
  imageError = signal(false);
  imageSrc = signal<string>("no_album_art.jpg");

  constructor() {
    effect(() => {
      const songImage = this.song().image;

      if (!this.imageLoader) {
        this.imageLoader = createImageLoader(songImage);
        this.imageLoading = this.imageLoader.imageLoading;
        this.imageError = this.imageLoader.imageError;
        this.imageSrc = this.imageLoader.imageSrc;
      } else {
        this.imageLoader.updateSrc(songImage);
      }
    });
  }

  ngOnDestroy() {
    this.imageLoader?.cleanup();
  }

  isActive = computed(
    () => this.playerService.song()?.link === this.song().link,
  );

  status = computed(() => {
    if (this.isActive()) {
      return this.playerService.status();
    }
    return PlayerStatus.Paused;
  });

  isDownloadingOffline = computed(() => {
    return this.offlineStorageService
      .currentLoadingDownloadSongIds()
      .includes(this.song().id);
  });

  isAvailableOffline = computed(() => {
    return this.offlineStorageService
      .availableOfflineSongIds()
      .includes(this.song().id);
  });

  isUnavailable = computed(() => {
    return this.settingsService.isOffline() && !this.isAvailableOffline();
  });

  isError = computed(() => this.status() === PlayerStatus.Error);

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
    if (this.status() === PlayerStatus.Paused) {
      await this.play();
    } else {
      await this.pause();
    }
  }

  emitReorder(data: { from: string; to: string }) {
    this.reorder.emit(data);
  }

  onImageLoad() {
    this.imageLoader.onImageLoad();
  }

  onImageError() {
    this.imageLoader.onImageError();
  }

  onImageLoadStart() {
    this.imageLoader.onImageLoadStart();
  }
}
