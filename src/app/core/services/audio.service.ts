import { Injectable, signal, OnDestroy } from '@angular/core';
import { PlayerStatus } from '../../features/player/models/player.model';

@Injectable({
  providedIn: 'root',
})
export class AudioService implements OnDestroy {
  private readonly audio = new Audio();

  readonly status = signal<PlayerStatus>(PlayerStatus.Stopped);
  readonly currentTime = signal<number>(0);
  readonly duration = signal<number>(0);

  private readonly setupListeners = void (() => {
    this.audio.volume = 1.0;
    
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
  })();

  setSource(src: string): void {
    this.audio.src = src;
    this.audio.load();
  }

  async play(): Promise<void> {
    try {
      await this.audio.play();
    } catch (error) {
      this.status.set(PlayerStatus.Error);
      console.error('Audio playback failed:', error);
    }
  }

  pause(): void {
    this.audio.pause();
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.status.set(PlayerStatus.Stopped);
  }

  seek(time: number): void {
    this.audio.currentTime = time;
  }

  ngOnDestroy(): void {
    this.audio.pause();
    this.audio.src = '';
    this.audio.load();
  }
}
