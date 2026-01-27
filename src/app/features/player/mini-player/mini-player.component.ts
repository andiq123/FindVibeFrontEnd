import {
  Component,
  input,
  output,
  computed,
  signal,
  ChangeDetectionStrategy,
  effect,
  OnDestroy,
} from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { faArrowUp, faTriangleExclamation } from "../../../shared/icons";
import { PlayerStatus } from "../models/player.model";
import { PlayerButtonComponent } from "../../../shared/player-button/player-button.component";
import { MovingTitleComponent } from "../../../shared/moving-title/moving-title.component";
import { Song } from "../../../core/models/song.model";
import {
  createImageLoader,
  ImageLoader,
} from "../../../shared/utils/image-loader.util";
import { NgOptimizedImage } from "@angular/common";

@Component({
  selector: "app-mini-player",
  standalone: true,
  imports: [
    FontAwesomeModule,
    PlayerButtonComponent,
    MovingTitleComponent,
    NgOptimizedImage,
  ],
  templateUrl: "./mini-player.component.html",
  styleUrl: "./mini-player.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiniPlayerComponent implements OnDestroy {
  song = input.required<Song>();
  status = input.required<PlayerStatus>();
  progress = input<number>(0);
  toggleSizeEvent = output<void>();

  playerStatus = PlayerStatus;
  faArrowUp = faArrowUp;
  faTriangleExclamation = faTriangleExclamation;

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
    if (this.imageLoader) {
      this.imageLoader.cleanup();
      this.imageLoader = undefined as any;
    }
  }

  isPlaying = computed(() => this.status() === PlayerStatus.Playing);
  isLoading = computed(() => this.status() === PlayerStatus.Loading);
  isError = computed(() => this.status() === PlayerStatus.Error);

  toggleSize() {
    this.toggleSizeEvent.emit();
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
