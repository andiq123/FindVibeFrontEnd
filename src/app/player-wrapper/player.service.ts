import { Injectable, signal } from '@angular/core';
import { Song } from '../songs/models/song.model';
import { PlayerStatus } from './models/player.model';
import { SongsService } from '../songs/songs.service';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private song = signal<Song | null>(null);
  private player = signal<HTMLAudioElement>(new Audio());
  private status = signal<PlayerStatus>(PlayerStatus.Stopped);
  private currentTime = signal<number>(0);
  private duration = signal<number>(0);
  private isRepeat = signal<boolean>(false);
  private isShuffle = signal<boolean>(false);
  song$ = this.song.asReadonly();
  status$ = this.status.asReadonly();
  currentTime$ = this.currentTime.asReadonly();
  duration$ = this.duration.asReadonly();
  isRepeat$ = this.isRepeat.asReadonly();
  isShuffle$ = this.isShuffle.asReadonly();

  constructor(private songsService: SongsService) {}

  registerEvents() {
    this.player().addEventListener('loadstart', () => {
      this.status.set(PlayerStatus.Loading);
    });

    this.player().addEventListener('loadeddata', () => {
      this.status.set(PlayerStatus.Playing);
    });

    this.player().addEventListener('play', () => {
      this.status.set(PlayerStatus.Playing);
    });

    this.player().addEventListener('pause', () => {
      this.status.set(PlayerStatus.Paused);
    });

    this.player().addEventListener('ended', () => {
      this.status.set(PlayerStatus.Ended);
      this.setNextSong();
    });

    this.player().addEventListener('error', () => {
      this.status.set(PlayerStatus.Error);
      this.song.set(null);
    });

    this.player().addEventListener('timeupdate', () => {
      this.currentTime.set(this.player().currentTime);
      this.updateDuration(this.player().duration);
    });

    this.setIsRepeatAndShuffle();
  }

  setSong(song: Song) {
    this.song.set(song);
    this.player().src = this.song()!.link;
  }

  setNewCurrentTime(time: number) {
    this.player().currentTime = time;
  }

  play() {
    this.player().play();
  }

  pause() {
    this.player().pause();
  }

  stop() {
    this.player().pause();
    this.player().currentTime = 0;
  }

  private setNextSong() {
    if (this.isRepeat()) {
      this.play();
      return;
    }

    const nextSong = this.songsService.getNextSong(
      this.song()!.id,
      this.isShuffle()
    );
    this.setSong(nextSong);
    this.play();
  }

  toggleRepeat() {
    this.isRepeat.set(!this.isRepeat());
    localStorage.setItem('isRepeat', JSON.stringify(this.isRepeat()));
  }

  toggleShuffle() {
    this.isShuffle.set(!this.isShuffle());
    localStorage.setItem('isShuffle', JSON.stringify(this.isShuffle()));
  }

  private setIsRepeatAndShuffle() {
    const isRepeat = localStorage.getItem('isRepeat');
    const isShuffle = localStorage.getItem('isShuffle');

    if (isRepeat) {
      this.isRepeat.set(JSON.parse(isRepeat));
    }

    if (isShuffle) {
      this.isShuffle.set(JSON.parse(isShuffle));
    }
  }

  private updateDuration(time: number) {
    if (!this.duration()) {
      this.duration.set(time);
      return;
    }

    if (time !== this.duration()) {
      this.duration.set(time);
      return;
    }

    return;
  }
}
