import { Injectable, signal, OnDestroy } from '@angular/core';
import { PlayerStatus } from '../../features/player/models/player.model';

@Injectable({
  providedIn: 'root',
})
export class AudioService implements OnDestroy {
  private audio = new Audio();
  
  status = signal<PlayerStatus>(PlayerStatus.Stopped);
  currentTime = signal<number>(0);
  duration = signal<number>(0);

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    this.audio.addEventListener('playing', () => this.status.set(PlayerStatus.Playing));
    this.audio.addEventListener('pause', () => {
      if (this.status() !== PlayerStatus.Loading) {
        this.status.set(PlayerStatus.Paused);
      }
    });
    this.audio.addEventListener('ended', () => this.status.set(PlayerStatus.Ended));
    this.audio.addEventListener('timeupdate', () => {
      this.currentTime.set(this.audio.currentTime);
      if (this.audio.duration && this.audio.duration !== this.duration()) {
        this.duration.set(this.audio.duration);
      }
    });
    this.audio.addEventListener('loadstart', () => this.status.set(PlayerStatus.Loading));
    this.audio.addEventListener('error', () => this.status.set(PlayerStatus.Error));
  }

  setSource(src: string) {
    this.audio.src = src;
    this.audio.load();
  }

  async play() {
    try {
      await this.audio.play();
    } catch (error) {
      this.status.set(PlayerStatus.Error);
      console.error('Audio playback failed:', error);
    }
  }

  pause() {
    this.audio.pause();
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.status.set(PlayerStatus.Stopped);
  }

  seek(time: number) {
    this.audio.currentTime = time;
  }

  ngOnDestroy() {
    this.audio.pause();
    this.audio.src = '';
    this.audio.load();
  }
}
