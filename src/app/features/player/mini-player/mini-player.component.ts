import {
  Component,
  input,
  output,
  inject,
  signal,
  effect,
  untracked,
  ChangeDetectionStrategy,
  DestroyRef,
} from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import {
  faArrowUp,
  faPause,
  faPlay,
  faStepBackward,
  faStepForward,
  faTriangleExclamation,
} from "../../../shared/icons";
import { PlayerStatus } from "../models/player.model";
import { PlayerButtonComponent } from "../../../shared/player-button/player-button.component";
import { MovingTitleComponent } from "../../../shared/moving-title/moving-title.component";
import { Song } from "../../../core/models/song.model";
import { NgOptimizedImage } from "@angular/common";
import { PlayerService } from "../../../core/services/player.service";
import { SettingsService } from "../../../core/services/settings.service";

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
export class MiniPlayerComponent {
  private readonly playerService = inject(PlayerService);
  private readonly settings = inject(SettingsService);
  private readonly destroyRef = inject(DestroyRef);

  song = input.required<Song>();
  status = input.required<PlayerStatus>();
  currentTime = input<number>(0);
  duration = input<number>(0);
  toggleSizeEvent = output<void>();

  readonly playError = this.playerService.playError;
  readonly settling = signal(false);
  playerStatus = PlayerStatus;
  faArrowUp = faArrowUp;
  faPlay = faPlay;
  faPause = faPause;
  faStepBackward = faStepBackward;
  faStepForward = faStepForward;
  faTriangleExclamation = faTriangleExclamation;

  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const tick = this.settings.miniSettled();
      if (tick === 0) return;
      untracked(() => this.pulseSettle());
    });
    this.destroyRef.onDestroy(() => {
      if (this.settleTimer != null) clearTimeout(this.settleTimer);
    });
  }

  progress = () => {
    const dur = this.duration();
    return dur > 0 ? (this.currentTime() / dur) * 100 : 0;
  };

  toggleSize() {
    this.toggleSizeEvent.emit();
  }

  async togglePlay($event: Event) {
    $event.stopPropagation();
    if (this.status() === PlayerStatus.Playing) {
      this.playerService.pause();
    } else {
      await this.playerService.play();
    }
  }

  async previous($event: Event) {
    $event.stopPropagation();
    await this.playerService.setPreviousSong();
  }

  async next($event: Event) {
    $event.stopPropagation();
    await this.playerService.setNextSong();
  }

  private pulseSettle(): void {
    if (
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    if (this.settleTimer != null) clearTimeout(this.settleTimer);
    this.settling.set(true);
    this.settleTimer = setTimeout(() => {
      this.settling.set(false);
      this.settleTimer = null;
    }, 420);
  }
}
