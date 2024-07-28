import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  output,
  Signal,
  signal,
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
} from '@fortawesome/free-solid-svg-icons';
import { PlayerService } from '../player.service';
import { PlayerStatus } from '../models/player.model';
import { getDominantColor } from '@rtcoder/dominant-color';
import { SongsService } from '../../songs/songs.service';

@Component({
  selector: 'app-full-player',
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: './full-player.component.html',
  styleUrl: './full-player.component.scss',
})
export class FullPlayerComponent implements OnInit, AfterViewInit {
  song!: Signal<Song | null>;
  status!: Signal<PlayerStatus>;
  currentTime!: Signal<number>;
  duration!: Signal<number>;
  onToggleSize = output<void>();
  img = viewChild<ElementRef<HTMLImageElement>>('img');

  faStepBackward = faStepBackward;
  faStepForward = faStepForward;
  faPlay = faPlay;
  faPause = faPause;
  faArrowDown = faArrowDown;

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

  coordY = signal<number>(0);
  startTime = signal<Date | null>(new Date());
  offset = signal<number>(0);

  swipeStart(e: TouchEvent): void {
    const coordY = e.changedTouches[0].clientY;

    if (this.offset() === 0) this.offset.set(coordY);
    if (!this.startTime()) {
      this.startTime.set(new Date());
      console.log('start', this.startTime());
    }

    this.coordY.set(coordY - this.offset());
  }

  swipeEnd(e: TouchEvent): void {
    const coordY = e.changedTouches[0].clientY;

    this.offset.set(coordY);
    this.resetCoordYSmooth();
    this.offset.set(0);

    const endTime = new Date();
    let duration = Math.abs(Number(this.startTime()) - Number(endTime));

    if (duration < 200) {
      this.toggleSize();
    }

    this.startTime.set(null);
  }

  resetCoordYSmooth() {
    const speed = 10;
    let interval: ReturnType<typeof setInterval>;
    if (this.coordY() > 0) {
      interval = setInterval(() => {
        this.coordY.update((oldValue) => oldValue - speed);
        if (this.coordY() < 0) {
          this.coordY.set(0);
          clearInterval(interval);
        }
      }, 1);
    } else {
      interval = setInterval(() => {
        this.coordY.update((oldValue) => oldValue + speed);
        if (this.coordY() > 0) {
          this.coordY.set(0);
          clearInterval(interval);
        }
      }, 1);
    }
  }
}
