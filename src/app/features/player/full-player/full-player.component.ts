import {
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
  inject,
  OnInit,
  AfterViewInit,
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

const OPEN_ANIM_MS = 500;
const CLOSE_ANIM_MS = 350;

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
export class FullPlayerComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly playerService = inject(PlayerService);
  readonly settingsService = inject(SettingsService);
  private router = inject(Router);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private openFallbackId: ReturnType<typeof setTimeout> | null = null;
  private closeFallbackId: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  song = input.required<Song>();
  status = input.required<PlayerStatus>();
  currentTime = input<number>(0);
  duration = input<number>(0);
  repeatModes = RepeatMode;
  playerStatus = PlayerStatus;
  toggleSizeEvent = output<void>();
  faStepBackward = faStepBackward;
  faStepForward = faStepForward;
  faPlay = faPlay;
  faPause = faPause;
  faRepeat = faRepeat;
  faShuffle = faShuffle;
  faTriangleExclamation = faTriangleExclamation;
  isClosingAnimation = signal(false);
  isOpeningAnimation = signal(false);
  isOpened = signal(false);
  isDraggingTime = signal(false);
  dragTime = signal(0);
  displayTime = () => this.isDraggingTime() ? this.dragTime() : this.currentTime();
  progressPercent = () => {
    const dur = this.duration();
    if (dur <= 0) return 0;
    return (this.displayTime() / dur) * 100;
  };
  ngOnInit() {
    this.renderer.setStyle(this.document.body, "overflow", "hidden");
  }
  ngAfterViewInit() {
    if (this.isOpened() || this.isClosingAnimation()) return;
    const startOpen = () => {
      if (this.destroyed) return;
      this.isOpeningAnimation.set(true);
      this.openFallbackId = setTimeout(() => {
        this.openFallbackId = null;
        if (!this.destroyed && this.isOpeningAnimation()) {
          this.isOpeningAnimation.set(false);
          this.isOpened.set(true);
        }
      }, OPEN_ANIM_MS);
    };
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => startOpen());
    } else {
      startOpen();
    }
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.renderer.removeStyle(this.document.body, "overflow");
    if (this.openFallbackId != null) clearTimeout(this.openFallbackId);
    if (this.closeFallbackId != null) clearTimeout(this.closeFallbackId);
  }
  onAnimationEnd(event: Event) {
    const animationEvent = event as AnimationEvent;
    const name = animationEvent.animationName ?? '';
    if (name.includes('slide-up') && this.isOpeningAnimation()) {
      if (this.openFallbackId != null) {
        clearTimeout(this.openFallbackId);
        this.openFallbackId = null;
      }
      this.isOpeningAnimation.set(false);
      this.isOpened.set(true);
    } else if (name.includes('slide-down') && this.isClosingAnimation()) {
      if (this.closeFallbackId != null) {
        clearTimeout(this.closeFallbackId);
        this.closeFallbackId = null;
      }
      this.isClosingAnimation.set(false);
      this.isOpened.set(false);
      this.toggleSizeEvent.emit();
    }
  }
  onSwipeClose() {
    if (this.isClosingAnimation()) return;
    if (this.closeFallbackId != null) {
      clearTimeout(this.closeFallbackId);
      this.closeFallbackId = null;
    }
    this.isOpeningAnimation.set(false);
    this.isClosingAnimation.set(false);
    this.isOpened.set(false);
    this.toggleSizeEvent.emit();
  }
  toggleSize() {
    if (this.isClosingAnimation() || this.isOpeningAnimation()) return;
    const reducedMotion = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      this.onSwipeClose();
      return;
    }
    this.isOpeningAnimation.set(false);
    this.isClosingAnimation.set(true);
    this.closeFallbackId = setTimeout(() => {
      this.closeFallbackId = null;
      if (!this.destroyed && this.isClosingAnimation()) {
        this.isClosingAnimation.set(false);
        this.isOpened.set(false);
        this.toggleSizeEvent.emit();
      }
    }, CLOSE_ANIM_MS);
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
    this.dragTime.set(value);
  }
  onTimeDragEnd(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.playerService.seek(value);
    this.isDraggingTime.set(false);
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
}
