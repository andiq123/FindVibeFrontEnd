import { Injectable, signal, OnDestroy } from '@angular/core';
import { PlayerStatus } from '../../features/player/models/player.model';

@Injectable({
  providedIn: 'root',
})
export class AudioService implements OnDestroy {
  private audio?: HTMLAudioElement;
  private abortController?: AbortController;

  readonly status = signal<PlayerStatus>(PlayerStatus.Stopped);
  readonly currentTime = signal<number>(0);
  readonly duration = signal<number>(0);

  initialize(): void {
    if (this.audio) return;

    this.audio = new Audio();
    this.audio.volume = 1.0;
    this.audio.preload = 'auto';
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    this.audio.addEventListener('playing', () => this.status.set(PlayerStatus.Playing), { signal });
    this.audio.addEventListener('pause', () => {
      if (this.status() !== PlayerStatus.Loading) {
        this.status.set(PlayerStatus.Paused);
      }
    }, { signal });
    this.audio.addEventListener('ended', () => this.status.set(PlayerStatus.Ended), { signal });
    this.audio.addEventListener('timeupdate', () => {
      if (!this.audio) return;
      this.currentTime.set(this.audio.currentTime);
      if (this.audio.duration && this.audio.duration !== this.duration()) {
        this.duration.set(this.audio.duration);
      }
    }, { signal });
    this.audio.addEventListener('loadstart', () => this.status.set(PlayerStatus.Loading), { signal });
    this.audio.addEventListener('error', () => this.status.set(PlayerStatus.Error), { signal });
  }

  setSource(src: string): void {
    if (!this.audio) this.initialize();
    if (!this.audio) return;

    this.audio.src = src;
    this.audio.load();
  }

  async play(): Promise<void> {
    if (!this.audio) return;
    try {
      await this.audio.play();
    } catch (error) {
      this.status.set(PlayerStatus.Error);
    }
  }

  pause(): void {
    this.audio?.pause();
  }

  stop(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.status.set(PlayerStatus.Stopped);
  }

  seek(time: number): void {
    if (this.audio) {
      this.audio.currentTime = time;
    }
  }

  ngOnDestroy(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio.load();
      this.audio = undefined;
    }
    this.abortController?.abort();
  }
}
