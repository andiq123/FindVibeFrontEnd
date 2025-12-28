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
  private router = inject(Router);

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

  convertTime(timeToConvert: number): string {
    return convertTime(timeToConvert);
  }

  toggleSize() {
    this.playerRef()?.nativeElement.addEventListener('animationend', () => {
      this.toggleSizeEvent.emit();
    });
    this.isClosingAnimation.set(true);
  }

  async play() {
    await this.playerService.play();
  }

  async pause() {
    this.playerService.pause();
  }

  handleTimeInput(event: Event) {
    this.isDraggingTime.set(true);
    const slider = event.target as HTMLInputElement;
    const value = +slider.value;
    const duration = this.duration();
    
    this.visualTime.set(value);
    
    const progress = this.timeProgress()?.nativeElement;
    if (progress && duration > 0) {
      const scale = value / duration;
      progress.style.transform = `scaleX(${scale})`;
    }
  }

  handleTimeChange(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.playerService.seek(value);
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

  async searchByArtist() {
    const artist = this.song().artist;
    if (artist) {
      await this.router.navigate([`/songs/${artist}`]);
      this.toggleSize();
    }
  }



  private async updateDominantColor(): Promise<string> {
    const song = this.song();
    if (!song?.image) return '#000000';

    return new Promise((resolve) => {
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
