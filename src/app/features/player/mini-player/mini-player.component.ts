import {
  Component,
  input,
  output,
  computed,
  signal,
  ChangeDetectionStrategy,
} from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { faArrowUp, faTriangleExclamation } from "../../../shared/icons";
import { PlayerStatus } from "../models/player.model";
import { PlayerButtonComponent } from "../../../shared/player-button/player-button.component";
import { MovingTitleComponent } from "../../../shared/moving-title/moving-title.component";
import { Song } from "../../../core/models/song.model";

import { NgOptimizedImage } from "@angular/common";

@Component({
  selector: "app-mini-player",
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
export class MiniPlayerComponent {
  song = input.required<Song>();
  status = input.required<PlayerStatus>();
  progress = input<number>(0);
  toggleSizeEvent = output<void>();

  playerStatus = PlayerStatus;
  faArrowUp = faArrowUp;
  faTriangleExclamation = faTriangleExclamation;
  imageLoading = signal(true);

  isPlaying = computed(() => this.status() === PlayerStatus.Playing);
  isLoading = computed(() => this.status() === PlayerStatus.Loading);
  isError = computed(() => this.status() === PlayerStatus.Error);

  toggleSize() {
    this.toggleSizeEvent.emit();
  }

  onImageLoad() {
    this.imageLoading.set(false);
  }

  onImageError() {
    this.imageLoading.set(false);
  }
}
