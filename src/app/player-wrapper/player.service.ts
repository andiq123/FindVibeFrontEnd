import { Injectable, signal } from '@angular/core';
import { Song } from '../songs/models/song.model';
import { PlayerStatus } from './models/player.model';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private song = signal<Song | null>(null);
  private player = signal<HTMLAudioElement>(new Audio());
  private status = signal<PlayerStatus>(PlayerStatus.Loading);
  private currentTime = signal<number>(0);
  private duration = signal<number>(0);
  song$ = this.song.asReadonly();
  status$ = this.status.asReadonly();
  currentTime$ = this.currentTime.asReadonly();
  duration$ = this.duration.asReadonly();

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
    });

    this.player().addEventListener('error', () => {
      this.status.set(PlayerStatus.Error);
      console.log('Player error!!!!');
    });

    this.player().addEventListener('timeupdate', () => {
      this.currentTime.set(this.player().currentTime);
      this.updateDuration(this.player().duration);
    });
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
