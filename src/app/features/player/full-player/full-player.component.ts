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
} from '@angular/core';
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
export class FullPlayerComponent {
  private playerService = inject(PlayerService);
  private settingsService = inject(SettingsService);

  song = input.required<Song>();
  status = input.required<PlayerStatus>();
  
  // Signals from service
  serviceCurrentTime = computed(() => this.playerService.currentTime());
  duration = computed(() => this.playerService.duration());
  serviceVolume = computed(() => this.playerService.volume());

  isRepeat = computed(() => this.settingsService.isRepeat());
  isShuffle = computed(() => this.settingsService.isShuffle());

  onToggleSize = output<void>();

  // Icons
  faStepBackward = faStepBackward;
  faStepForward = faStepForward;
  faPlay = faPlay;
  faPause = faPause;
  faRepeat = faRepeat;
  faShuffle = faShuffle;

  playerStatus = PlayerStatus;

  isClosingAnimation = signal<boolean>(false);
  
  // Direct DOM References
  playerRef = viewChild<ElementRef<HTMLDivElement>>('playerRef');
  timeSlider = viewChild<ElementRef<HTMLInputElement>>('timeSlider');
  timeProgress = viewChild<ElementRef<HTMLDivElement>>('timeProgress');

  dominantColor = computed(() => this.updateDominantColor());

  // Local state
  isDraggingTime = signal<boolean>(false);
  currentTime = computed(() => this.serviceCurrentTime());
  
  // Optimized Visual Time signal (only for text display)
  visualTime = signal<number>(0);

  constructor() {
    // 1. Sync Time Slider (One-way binding from Service -> DOM)
    effect(() => {
      const time = this.serviceCurrentTime();
      const duration = this.duration();
      
      // Update visual text if not dragging
      if (!this.isDraggingTime()) {
        this.visualTime.set(time);
        
        // Direct DOM update for slider position
        const slider = this.timeSlider()?.nativeElement;
        const progress = this.timeProgress()?.nativeElement;
        
        if (slider && progress && duration > 0) {
          slider.value = time.toString();
          const scale = time / duration;
          progress.style.transform = `scaleX(${scale})`;
        }
      }
    });

    // 2. Sync Volume Slider Logic Removed
  }

  convertTime(timeToConvert: number): string {
    return convertTime(timeToConvert);
  }

  toggleSize() {
    this.playerRef()?.nativeElement.addEventListener('animationend', () => {
      this.onToggleSize.emit();
    });
    this.isClosingAnimation.set(true);
  }

  async play() {
    await this.playerService.play();
  }

  async pause() {
    this.playerService.pause();
  }

  // Optimized Time Input (Direct DOM)
  handleTimeInput(event: Event) {
    this.isDraggingTime.set(true);
    const slider = event.target as HTMLInputElement;
    const value = +slider.value;
    const duration = this.duration();
    
    // 1. Update visual text signal
    this.visualTime.set(value);
    
    // 2. Direct DOM update for progress bar (Zero Lag)
    const progress = this.timeProgress()?.nativeElement;
    if (progress && duration > 0) {
      const scale = value / duration;
      progress.style.transform = `scaleX(${scale})`;
    }
  }

  handleTimeChange(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.playerService.setCurrentTime(value);
    // Add small delay to prevent jumping back
    setTimeout(() => {
      this.isDraggingTime.set(false);
    }, 50);
  }

  // Volume methods removed


  async nextSong() {
    await this.playerService.setNextSong();
  }

  async previousSong() {
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

    return new Promise((resolve, reject) => {
      const htmlElementImage = document.createElement('img');
      htmlElementImage.src = song.image;

      htmlElementImage.addEventListener('load', () => {
        getDominantColor(htmlElementImage, {
          downScaleFactor: 1,
          skipPixels: 0,
          colorFormat: 'hex',
          callback: (color) => resolve(color),
        });
      });

      htmlElementImage.addEventListener('error', () => {
        resolve('#000000'); // Fallback instead of reject
      });
    });
  }
}
