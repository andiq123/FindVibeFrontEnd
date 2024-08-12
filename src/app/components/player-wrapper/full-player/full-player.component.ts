import {
  Component,
  computed,
  ElementRef,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { convertTime } from '../../../utils/utils';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowDown,
  faPause,
  faPlay,
  faRepeat,
  faShuffle,
  faStepBackward,
  faStepForward,
} from '@fortawesome/free-solid-svg-icons';
import { PlayerStatus } from '../models/player.model';
import { getDominantColor } from '@rtcoder/dominant-color';
import { MovingTitleComponent } from '../../../shared/moving-title/moving-title.component';
import { SettingsService } from '../../../services/settings.service';
import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { FavoriteButtonComponent } from '../../../shared/favorite-button/favorite-button.component';
import { SwipeDownDirective } from '../directives/swipe-down.directive';
import { HoldClickDirective } from '../directives/hold-click.directive';
import { PlayerService } from '../../../services/player.service';
import { RemoteService } from '../../../services/remote.service';

@Component({
  selector: 'app-full-player',
  standalone: true,
  imports: [
    FontAwesomeModule,
    MovingTitleComponent,
    NgOptimizedImage,
    AsyncPipe,
    FavoriteButtonComponent,
    SwipeDownDirective,
    HoldClickDirective,
  ],
  templateUrl: './full-player.component.html',
  styleUrl: './full-player.component.scss',
})
export class FullPlayerComponent {
  song = computed(() => this.playerService.song$());
  status = computed(() => this.playerService.status$());
  currentTime = computed(() => this.playerService.currentTime$());
  duration = computed(() => this.playerService.duration$());
  isFirstError = computed(() => this.playerService.firstError());
  isRepeat = computed(() => this.settingsService.isRepeat$());
  isShuffle = computed(() => this.settingsService.isShuffle$());
  isRemoteServerConnected = computed(() => this.remoteService.isConnected());

  onToggleSize = output<void>();

  faStepBackward = faStepBackward;
  faStepForward = faStepForward;
  faPlay = faPlay;
  faPause = faPause;
  faArrowDown = faArrowDown;
  faRepeat = faRepeat;
  faShuffle = faShuffle;

  playerStatus = PlayerStatus;

  isClosingAnimation = signal<boolean>(false);
  playerRef = viewChild<ElementRef<HTMLDivElement>>('playerRef');

  dominantColor = computed(() => this.updateDominantColor());

  constructor(
    private playerService: PlayerService,
    private settingsService: SettingsService,
    private remoteService: RemoteService
  ) {}

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
    this.playerService.play();
    if (this.isRemoteServerConnected()) {
      await this.remoteService.play();
    }
  }

  async pause() {
    this.playerService.pause();
    if (this.isRemoteServerConnected()) {
      await this.remoteService.pause();
    }
  }

  async seekTime(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.playerService.setCurrentTime(+value);
    if (this.isRemoteServerConnected()) {
      await this.remoteService.updateTime(value);
    }
  }

  async nextSong() {
    const song = await this.playerService.setNextSong();
    if (this.isRemoteServerConnected()) {
      await this.remoteService.setSong(song!);
    }
  }

  async previousSong() {
    const song = await this.playerService.setPreviousSong();
    if (this.isRemoteServerConnected()) {
      await this.remoteService.setSong(song!);
    }
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
    return new Promise((resolve, reject) => {
      const htmlElementImage = document.createElement('img');
      htmlElementImage.src = this.song()?.image || '';

      if (!htmlElementImage.src) {
        return reject('No image source provided.');
      }

      htmlElementImage.addEventListener('load', () => {
        getDominantColor(htmlElementImage, {
          downScaleFactor: 1,
          skipPixels: 0,
          colorFormat: 'hex',
          callback: (color) => resolve(color),
        });
      });

      htmlElementImage.addEventListener('error', () => {
        reject('Image failed to load.');
      });
    });
  }
}
