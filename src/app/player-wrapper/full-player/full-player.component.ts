import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  OnChanges,
  OnInit,
  output,
  Signal,
  signal,
  SimpleChanges,
  viewChild,
} from '@angular/core';
import { Song } from '../../songs/models/song.model';
import { convertTime } from '../../utils/utils';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faStepBackward,
  faStepForward,
  faPlay,
  faPause,
  faArrowDown,
  faRepeat,
  faShuffle,
} from '@fortawesome/free-solid-svg-icons';
import { PlayerService } from '../player.service';
import { PlayerStatus } from '../models/player.model';
import { getDominantColor } from '@rtcoder/dominant-color';
import { SongsService } from '../../songs/songs.service';
import { MovingTitleComponent } from '../../shared/moving-title/moving-title.component';

@Component({
  selector: 'app-full-player',
  standalone: true,
  imports: [FontAwesomeModule, MovingTitleComponent],
  templateUrl: './full-player.component.html',
  styleUrl: './full-player.component.scss',
})
export class FullPlayerComponent implements OnInit, AfterViewInit {
  song!: Signal<Song | null>;
  status!: Signal<PlayerStatus>;
  currentTime!: Signal<number>;
  duration!: Signal<number>;
  isRepeat!: Signal<boolean>;
  isShuffle!: Signal<boolean>;
  onToggleSize = output<void>();
  img = viewChild<ElementRef<HTMLImageElement>>('img');

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

  dominantColor = signal<string | null>(null);

  constructor(
    private playerService: PlayerService,
    private songsService: SongsService
  ) {}

  ngOnInit(): void {
    this.status = this.playerService.status$;
    this.currentTime = this.playerService.currentTime$;
    this.duration = this.playerService.duration$;
    this.isRepeat = this.playerService.isRepeat$;
    this.isShuffle = this.playerService.isShuffle$;
    this.song = this.playerService.song$;
  }

  ngAfterViewInit(): void {
    getDominantColor(this.img()!.nativeElement, {
      downScaleFactor: 1,
      skipPixels: 0,
      colorFormat: 'hex',
      callback: (color) => {
        this.dominantColor.set(color);
      },
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
    this.playerService.setNewCurrentTime(+value);
  }

  nextSong() {
    const nextSong = this.songsService.getNextSong(this.song()!.id);
    this.playerService.setSong(nextSong);
    this.play();
  }

  previousSong() {
    const previousSong = this.songsService.getPreviousSong(this.song()!.id);
    this.playerService.setSong(previousSong);
    this.play();
  }

  toggleRepeat() {
    this.playerService.toggleRepeat();
    if (this.isShuffle()) {
      this.playerService.toggleShuffle();
    }
  }

  toggleShuffle() {
    this.playerService.toggleShuffle();
    if (this.isRepeat()) {
      this.playerService.toggleRepeat();
    }
  }
}
