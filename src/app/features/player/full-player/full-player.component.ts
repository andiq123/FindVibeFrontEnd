import {
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
  inject,
} from '@angular/core';
import { convertTime } from '../../../core/utils/utils';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowDown,
  faPause,
  faPlay,
  faRepeat,
  faShuffle,
  faStepBackward,
  faStepForward,
  faCloudArrowDown,
} from '@fortawesome/free-solid-svg-icons';
import { PlayerStatus } from '../models/player.model';
import { getDominantColor } from '@rtcoder/dominant-color';
import { MovingTitleComponent } from '../../../shared/moving-title/moving-title.component';
import { SettingsService } from '../../../core/services/settings.service';
import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { FavoriteButtonComponent } from '../../../shared/favorite-button/favorite-button.component';
import { SwipeDownDirective } from '../directives/swipe-down.directive';
import { PlayerService } from '../../../core/services/player.service';
import { Song } from '../../../core/models/song.model';

@Component({
    selector: 'app-full-player',
    imports: [
        FontAwesomeModule,
        MovingTitleComponent,
        NgOptimizedImage,
        AsyncPipe,
        FavoriteButtonComponent,
        SwipeDownDirective,
    ],
    templateUrl: './full-player.component.html',
    styleUrl: './full-player.component.scss'
})
export class FullPlayerComponent {
  private playerService = inject(PlayerService);
  private settingsService = inject(SettingsService);

  song = input.required<Song>();
  status = input.required<PlayerStatus>();
  currentTime = computed(() => this.playerService.currentTime());
  duration = computed(() => this.playerService.duration());
  isRepeat = computed(() => this.settingsService.isRepeat());
  isShuffle = computed(() => this.settingsService.isShuffle());

  onToggleSize = output<void>();

  faStepBackward = faStepBackward;
  faStepForward = faStepForward;
  faPlay = faPlay;
  faPause = faPause;
  faArrowDown = faArrowDown;
  faRepeat = faRepeat;
  faShuffle = faShuffle;
  faCloudArrowDown = faCloudArrowDown;

  playerStatus = PlayerStatus;

  isClosingAnimation = signal<boolean>(false);
  playerRef = viewChild<ElementRef<HTMLDivElement>>('playerRef');

  dominantColor = computed(() => this.updateDominantColor());

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

  async seekTime(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.playerService.setCurrentTime(+value);
  }

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

  downloadSong() {
    const link = document.createElement('a');
    link.download = this.song()?.artist + ' - ' + this.song()?.title + '.mp3';
    link.href = this.song()!.link;
    link.click();
    link.remove();
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
