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
  faHeart as favoritedHeart,
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
import { SettingsService } from '../settings.service';
import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { faHeart as unFavoritedHeart } from '@fortawesome/free-regular-svg-icons';
import { LibraryService } from '../../../library/services/library.service';
import { UserService } from '../../../library/services/user.service';

@Component({
  selector: 'app-full-player',
  standalone: true,
  imports: [
    FontAwesomeModule,
    MovingTitleComponent,
    NgOptimizedImage,
    AsyncPipe,
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
  isAbleToAddToFav!: Signal<boolean>;
  isFavorited!: Signal<boolean>;
  onToggleSize = output<void>();

  faStepBackward = faStepBackward;
  faStepForward = faStepForward;
  faPlay = faPlay;
  faPause = faPause;
  faArrowDown = faArrowDown;
  faRepeat = faRepeat;
  faShuffle = faShuffle;
  unFavoritedHeart = unFavoritedHeart;
  favoritedHeart = favoritedHeart;

  playerStatus = PlayerStatus;

  isClosingAnimation = signal<boolean>(false);
  playerRef = viewChild<ElementRef<HTMLDivElement>>('playerRef');

  dominantColor = computed(() => this.updateDominantColor());

  constructor(
    private playerService: PlayerService,
    private settingsService: SettingsService,
    private libraryService: LibraryService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.status = this.playerService.status$;
    this.currentTime = this.playerService.currentTime$;
    this.duration = this.playerService.duration$;
    this.isRepeat = this.settingsService.isRepeat$;
    this.isShuffle = this.settingsService.isShuffle$;
    this.song = this.playerService.song$;
    this.isFavorited = computed(() =>
      this.libraryService
        .songs$()
        .some((song) => song.link === this.song()!.link)
    );
    this.isAbleToAddToFav = computed(() => {
      return !!this.userService.user$();
    });
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

  toggleAddToFavorite() {
    if (this.isFavorited()) {
      this.libraryService.removeFromFavorites(
        this.song()!.id,
        this.song()!.link
      );
    } else {
      this.libraryService.addToFavorites(
        this.song()!,
        this.userService.user$()!.id
      );
    }
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
