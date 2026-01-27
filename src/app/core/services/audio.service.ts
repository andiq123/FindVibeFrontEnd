import { Injectable, signal, OnDestroy, inject } from "@angular/core";
import { PlayerStatus } from "../../features/player/models/player.model";
import { RecentService } from "../../features/recent/services/recent.service";
import { PlaylistService } from "./playlist.service";

@Injectable({
  providedIn: "root",
})
export class AudioService implements OnDestroy {
  private readonly recentService = inject(RecentService);
  private readonly playlistService = inject(PlaylistService);
  
  private audio?: HTMLAudioElement;
  private abortController?: AbortController;
  private alreadyAddedToRecents = false;

  readonly status = signal<PlayerStatus>(PlayerStatus.Stopped);
  readonly currentTime = signal<number>(0);
  readonly duration = signal<number>(0);

  initialize(): void {
    if (this.audio) return;

    this.audio = new Audio();
    this.audio.volume = 1.0;
    this.audio.preload = "auto";
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    this.audio.addEventListener(
      "playing",
      () => this.status.set(PlayerStatus.Playing),
      { signal },
    );
    this.audio.addEventListener(
      "pause",
      () => {
        if (this.status() !== PlayerStatus.Loading) {
          this.status.set(PlayerStatus.Paused);
        }
      },
      { signal },
    );
    this.audio.addEventListener(
      "ended",
      () => this.status.set(PlayerStatus.Ended),
      { signal },
    );
    this.audio.addEventListener(
      "timeupdate",
      () => {
        if (!this.audio) return;
        const time = this.audio.currentTime;
        this.currentTime.set(time);
        if (this.audio.duration && this.audio.duration !== this.duration()) {
          this.duration.set(this.audio.duration);
        }
        
        // Add to recents after 7 seconds
        if (time > 7 && !this.alreadyAddedToRecents) {
          const song = this.playlistService.currentSong();
          if (song) {
            this.alreadyAddedToRecents = true;
            this.recentService.addSongToRecents(song);
          }
        }
      },
      { signal },
    );
    this.audio.addEventListener(
      "loadstart",
      () => this.status.set(PlayerStatus.Loading),
      { signal },
    );
    this.audio.addEventListener(
      "error",
      () => this.status.set(PlayerStatus.Error),
      { signal },
    );
  }

  setSource(src: string): void {
    if (!this.audio) this.initialize();
    if (!this.audio) return;

    this.alreadyAddedToRecents = false; // Reset when new song starts
    this.audio.src = src;
    this.audio.load();
  }

  async play(): Promise<void> {
    if (!this.audio) return;
    try {
      await this.audio.play();
    } catch {
      this.status.set(PlayerStatus.Error);
    }
  }

  pause(): void {
    this.audio?.pause();
  }

  seek(time: number): void {
    if (this.audio) {
      this.audio.currentTime = time;
    }
  }

  ngOnDestroy(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio.load();
      this.audio = undefined;
    }
    this.abortController?.abort();
  }
}
