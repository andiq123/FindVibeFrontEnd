import { Injectable, signal, OnDestroy, inject } from "@angular/core";
import { PlayerStatus } from "../../features/player/models/player.model";
import { StorageService } from "./storage.service";
import { PlaylistService } from "./playlist.service";

@Injectable({
  providedIn: "root",
})
export class AudioService implements OnDestroy {
  private readonly storageService = inject(StorageService);
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
    // iOS: keep playback eligible for lock-screen / Now Playing controls
    this.audio.setAttribute("playsinline", "true");
    this.audio.setAttribute("webkit-playsinline", "true");
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
        const s = this.status();
        // Don't clobber Loading / Error — pause is often a no-op after a failed load.
        if (s === PlayerStatus.Loading || s === PlayerStatus.Error) return;
        this.status.set(PlayerStatus.Paused);
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
        if (time > 7 && !this.alreadyAddedToRecents) {
          const song = this.playlistService.currentSong();
          if (song) {
            this.alreadyAddedToRecents = true;
            this.storageService.addSongToRecents(song);
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
      () => {
        // Src swap aborts the previous load — not a real failure.
        if (this.audio?.error?.code === MediaError.MEDIA_ERR_ABORTED) return;
        this.status.set(PlayerStatus.Error);
      },
      { signal },
    );
  }

  setSource(src: string): void {
    if (!this.audio) this.initialize();
    if (!this.audio) return;
    this.alreadyAddedToRecents = false;
    this.audio.src = src;
    this.audio.load();
  }

  /** Explicit failure without touching media src (offline / policy). */
  fail(): void {
    this.status.set(PlayerStatus.Error);
  }

  /** Continue-listening restore — loaded but not playing. */
  markPaused(): void {
    this.status.set(PlayerStatus.Paused);
  }

  async play(): Promise<void> {
    if (!this.audio) return;
    try {
      await this.audio.play();
    } catch (e) {
      if (e instanceof DOMException) {
        // Interrupted by a newer setSong — ignore.
        if (e.name === "AbortError") return;
        // Browser blocked autoplay — needs a gesture, not a "broken track".
        if (e.name === "NotAllowedError") {
          this.status.set(PlayerStatus.Paused);
          return;
        }
      }
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
