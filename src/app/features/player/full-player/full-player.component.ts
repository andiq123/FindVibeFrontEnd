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
  OnInit,
  OnDestroy,
  Renderer2,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { convertTime } from '../../../core/utils/utils';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faPause,
  faPlay,
  faRepeat,
  faShuffle,
  faStepBackward,
  faStepForward,
} from '@fortawesome/free-solid-svg-icons';
import { PlayerStatus } from '../models/player.model';
import { getDominantColor } from '@rtcoder/dominant-color';
import { SettingsService } from '../../../core/services/settings.service';
import { NgOptimizedImage } from '@angular/common';
import { FavoriteButtonComponent } from '../../../shared/favorite-button/favorite-button.component';
import { SwipeDownDirective } from '../directives/swipe-down.directive';
import { PlayerService } from '../../../core/services/player.service';
import { Song } from '../../../core/models/song.model';
import { MovingTitleComponent } from '../../../shared/moving-title/moving-title.component';

@Component({
  selector: 'app-full-player',
  standalone: true,
  imports: [
    FontAwesomeModule,
    NgOptimizedImage,
    FavoriteButtonComponent,
    SwipeDownDirective,
    MovingTitleComponent,
  ],
  templateUrl: './full-player.component.html',
  styleUrl: './full-player.component.scss',
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

  isRepeat = computed(() => this.settingsService.isRepeat());
  isShuffle = computed(() => this.settingsService.isShuffle());

  toggleSizeEvent = output<void>();

  faStepBackward = faStepBackward;
  faStepForward = faStepForward;
  faPlay = faPlay;
  faPause = faPause;
  faRepeat = faRepeat;
  faShuffle = faShuffle;

  playerStatus = PlayerStatus;

  isClosingAnimation = signal<boolean>(false);
  isOpeningAnimation = signal<boolean>(true);

  playerRef = viewChild<ElementRef<HTMLDivElement>>('playerRef');
  timeSlider = viewChild<ElementRef<HTMLInputElement>>('timeSlider');
  timeProgress = viewChild<ElementRef<HTMLDivElement>>('timeProgress');

  dominantColor = computed(() => this.updateDominantColor());

  isDraggingTime = signal<boolean>(false);
  currentTime = computed(() => this.serviceCurrentTime());

  visualTime = signal<number>(0);

  constructor() {
    effect(() => {
      const time = this.serviceCurrentTime();
      const duration = this.duration();

      if (!this.isDraggingTime()) {
        this.visualTime.set(time);

        const slider = this.timeSlider()?.nativeElement;
        const progress = this.timeProgress()?.nativeElement;

        if (slider && progress && duration > 0) {
          slider.value = time.toString();
          const scale = time / duration;
          progress.style.transform = `scaleX(${scale})`;
        }
      }
    });
  }

  ngOnInit() {
    this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
    setTimeout(() => this.isOpeningAnimation.set(false), 600);
  }

  ngOnDestroy() {
    this.renderer.removeStyle(this.document.body, 'overflow');
  }

  formatTime(time: number): string {
    return convertTime(time);
  }

  toggleSize(isImmediate = false) {
    if (isImmediate) {
      this.toggleSizeEvent.emit();
      return;
    }
    this.playerRef()?.nativeElement.addEventListener('animationend', () => {
      this.toggleSizeEvent.emit();
    }, { once: true });
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

    const progress = this.timeProgress()?.nativeElement;
    const duration = this.duration();
    if (progress && duration > 0) {
      const scale = value / duration;
      progress.style.transform = `scaleX(${scale})`;
    }
  }

  onTimeDragEnd(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
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

  private async updateDominantColor(): Promise<string> {
    const song = this.song();
    if (!song?.image) return '#000000';

    return new Promise((resolve) => {
      const img = new Image();
      img.src = song.image;
      img.onload = () => {
        getDominantColor(img, {
          downScaleFactor: 1,
          skipPixels: 0,
          colorFormat: 'hex',
          callback: (color) => resolve(color),
        });
      };
      img.onerror = () => resolve('#000000');
    });
  }
}
