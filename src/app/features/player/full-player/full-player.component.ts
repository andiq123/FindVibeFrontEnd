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
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faPause,
  faPlay,
  faRepeat,
  faShuffle,
  faStepBackward,
  faStepForward,
} from '@fortawesome/free-solid-svg-icons';
import { PlayerStatus, RepeatMode } from '../models/player.model';
import { SettingsService } from '../../../core/services/settings.service';
import { NgOptimizedImage } from '@angular/common';
import { FavoriteButtonComponent } from '../../../shared/favorite-button/favorite-button.component';
import { SwipeDownDirective } from '../directives/swipe-down.directive';
import { PlayerService } from '../../../core/services/player.service';
import { Song } from '../../../core/models/song.model';
import { MovingTitleComponent } from '../../../shared/moving-title/moving-title.component';
import { TimeFormatPipe } from '../../../shared/pipes/time-format.pipe';

@Component({
  selector: 'app-full-player',
  standalone: true,
  imports: [
    FontAwesomeModule,
    NgOptimizedImage,
    FavoriteButtonComponent,
    SwipeDownDirective,
    MovingTitleComponent,
    TimeFormatPipe,
  ],
  templateUrl: './full-player.component.html',
  styleUrl: './full-player.component.scss',
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

  isClosingAnimation = signal<boolean>(false);
  isOpeningAnimation = signal<boolean>(true);

  playerRef = viewChild<ElementRef<HTMLDivElement>>('playerRef');
  timeSlider = viewChild<ElementRef<HTMLInputElement>>('timeSlider');

  isDraggingTime = signal<boolean>(false);
  visualTime = signal<number>(0);
  private lastSeekTimestamp = 0;

  private timeSyncEffect = effect(() => {
    const time = this.serviceCurrentTime();
    const now = Date.now();
    
    if (!this.isDraggingTime() && (now - this.lastSeekTimestamp > 500)) {
      untracked(() => this.visualTime.set(time));
    }
  });

  progressPercent = computed(() => {
    const duration = this.duration();
    if (duration <= 0) return 0;
    return (this.visualTime() / duration) * 100;
  });

  constructor() {}

  ngOnInit() {
    this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
    setTimeout(() => this.isOpeningAnimation.set(false), 550);
  }

  ngOnDestroy() {
    this.renderer.removeStyle(this.document.body, 'overflow');
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
      this.router.navigate(['/songs', artistName]);
    }
  }
}
