import {
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
  inject,
  effect,
  untracked,
  OnInit,
  OnDestroy,
  Renderer2,
  ChangeDetectionStrategy,
} from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { Router } from "@angular/router";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import {
  faPause,
  faPlay,
  faRepeat,
  faShuffle,
  faStepBackward,
  faStepForward,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { PlayerStatus, RepeatMode } from "../models/player.model";
import { SettingsService } from "../../../core/services/settings.service";
import { NgOptimizedImage } from "@angular/common";
import { FavoriteButtonComponent } from "../../../shared/favorite-button/favorite-button.component";
import { SwipeDownDirective } from "../directives/swipe-down.directive";
import { PlayerService } from "../../../core/services/player.service";
import { Song } from "../../../core/models/song.model";
import { MovingTitleComponent } from "../../../shared/moving-title/moving-title.component";
import { TimeFormatPipe } from "../../../shared/pipes/time-format.pipe";
import {
  createImageLoader,
  ImageLoader,
} from "../../../shared/utils/image-loader.util";

@Component({
  selector: "app-full-player",
  standalone: true,
  imports: [
    FontAwesomeModule,
    NgOptimizedImage,
    FavoriteButtonComponent,
    SwipeDownDirective,
    MovingTitleComponent,
    TimeFormatPipe,
  ],
  templateUrl: "./full-player.component.html",
  styleUrl: "./full-player.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FullPlayerComponent implements OnInit, OnDestroy {
  private playerService = inject(PlayerService);
  private settingsService = inject(SettingsService);
  private router = inject(Router);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);

  song = input.required<Song>();
  status = input.required<PlayerStatus>();

  serviceCurrentTime = computed(() => this.playerService.currentTime());
  duration = computed(() => this.playerService.duration());

  repeatMode = computed(() => this.settingsService.repeatMode());
  isShuffle = computed(() => this.settingsService.isShuffle());

  repeatModes = RepeatMode;

  toggleSizeEvent = output<void>();

  faStepBackward = faStepBackward;
  faStepForward = faStepForward;
  faPlay = faPlay;
  faPause = faPause;
  faRepeat = faRepeat;
  faShuffle = faShuffle;

  playerStatus = PlayerStatus;

  isClosingAnimation = signal(false);
  isOpeningAnimation = signal(false);
  isError = computed(() => this.status() === PlayerStatus.Error);

  faTriangleExclamation = faTriangleExclamation;

  playerRef = viewChild<ElementRef<HTMLDivElement>>("playerRef");

  isDraggingTime = signal(false);
  visualTime = signal(0);
  private lastSeekTimestamp = 0;
  private lastVisualUpdateTime = 0;
  private readonly VISUAL_UPDATE_THROTTLE_MS = 33; // ~30fps

  progressPercent = computed(() => {
    const duration = this.duration();
    if (duration <= 0) return 0;
    return (this.visualTime() / duration) * 100;
  });

  private imageLoader!: ImageLoader;
  imageLoading = signal(true);
  imageError = signal(false);
  imageSrc = signal<string>("no_album_art.jpg");
  private updateFrameId: number | null = null;

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

    effect(() => {
      const time = this.serviceCurrentTime();
      const now = Date.now();

      // Skip update if dragging or recently seeked
      if (this.isDraggingTime() || now - this.lastSeekTimestamp < 500) {
        return;
      }

      // Throttle visual updates to ~30fps
      if (now - this.lastVisualUpdateTime < this.VISUAL_UPDATE_THROTTLE_MS) {
        return;
      }

      // Cancel any pending frame request
      if (this.updateFrameId !== null) {
        cancelAnimationFrame(this.updateFrameId);
        this.updateFrameId = null;
      }

      // Schedule update
      this.updateFrameId = requestAnimationFrame(() => {
        untracked(() => {
          this.visualTime.set(time);
          this.lastVisualUpdateTime = Date.now();
        });
        this.updateFrameId = null;
      });
    });
  }

  ngOnInit() {
    this.renderer.setStyle(this.document.body, "overflow", "hidden");
    this.isOpeningAnimation.set(true);
  }

  ngOnDestroy() {
    this.renderer.removeStyle(this.document.body, "overflow");
    if (this.imageLoader) {
      this.imageLoader.cleanup();
      this.imageLoader = undefined as any;
    }
    if (this.updateFrameId !== null) {
      cancelAnimationFrame(this.updateFrameId);
      this.updateFrameId = null;
    }
  }

  onAnimationEnd() {
    if (this.isOpeningAnimation()) {
      this.isOpeningAnimation.set(false);
    }
    if (this.isClosingAnimation()) {
      this.toggleSizeEvent.emit();
    }
  }

  toggleSize() {
    this.isOpeningAnimation.set(false);
    this.isClosingAnimation.set(true);
  }

  async togglePlay() {
    if (this.status() === PlayerStatus.Playing) {
      this.playerService.pause();
    } else {
      await this.playerService.play();
    }
  }

  onTimeDragStart() {
    this.isDraggingTime.set(true);
  }

  onTimeChange(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.visualTime.set(value);
  }

  onTimeDragEnd(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.lastSeekTimestamp = Date.now();
    this.playerService.seek(value);
    setTimeout(() => this.isDraggingTime.set(false), 50);
  }

  async next() {
    await this.playerService.setNextSong();
  }

  async previous() {
    await this.playerService.setPreviousSong();
  }

  toggleRepeat() {
    this.settingsService.toggleRepeat();
  }

  toggleShuffle() {
    this.settingsService.toggleShuffle();
  }

  navigateToArtist() {
    const artistName = this.song().artist;
    if (artistName) {
      this.toggleSize();
      this.router.navigate(["/songs", artistName]);
    }
  }

  onImageLoad() {
    if (this.imageLoader) {
      this.imageLoader.onImageLoad();
    }
  }

  onImageError() {
    if (this.imageLoader) {
      this.imageLoader.onImageError();
    }
  }

  onImageLoadStart() {
    if (this.imageLoader) {
      this.imageLoader.onImageLoadStart();
    }
  }
}
