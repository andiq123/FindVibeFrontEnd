import {
  Component,
  computed,
  ElementRef,
  OnInit,
  output,
  Signal,
  signal,
  viewChild,
} from '@angular/core';
import { Song } from '../../../songs/models/song.model';
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
import { PlayerService } from '../player.service';
import { PlayerStatus } from '../models/player.model';
import { getDominantColor } from '@rtcoder/dominant-color';
import { MovingTitleComponent } from '../../../shared/moving-title/moving-title.component';
import { SettingsService } from '../../../services/settings.service';
import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { LibraryService } from '../../../library/services/library.service';
import { UserService } from '../../../library/services/user.service';
import { FavoriteButtonComponent } from '../../../shared/favorite-button/favorite-button.component';
import { SwipeDownDirective } from '../../../shared/directives/swipe-down.directive';

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
  ],
  templateUrl: './full-player.component.html',
  styleUrl: './full-player.component.scss',
})
export class FullPlayerComponent implements OnInit {
  song!: Signal<Song | null>;
  status!: Signal<PlayerStatus>;
  currentTime!: Signal<number>;
  duration!: Signal<number>;
  isRepeat!: Signal<boolean>;
  isShuffle!: Signal<boolean>;
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
    private settingsService: SettingsService
  ) {}

  ngOnInit(): void {
    this.status = this.playerService.status$;
    this.currentTime = this.playerService.currentTime$;
    this.duration = this.playerService.duration$;
    this.isRepeat = this.settingsService.isRepeat$;
    this.isShuffle = this.settingsService.isShuffle$;
    this.song = this.playerService.song$;
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

  play() {
    this.playerService.play();
  }

  pause() {
    this.playerService.pause();
  }

  seekTime(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.playerService.setCurrentTime(+value);
  }

  nextSong() {
    this.playerService.setNextSong();
  }

  previousSong() {
    this.playerService.setPreviousSong();
  }

  toggleRepeat() {
    this.settingsService.toggleRepeat();
  }

  toggleShuffle() {
    this.settingsService.toggleShuffle();
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
