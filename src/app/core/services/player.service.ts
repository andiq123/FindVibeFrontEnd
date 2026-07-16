import {
  Injectable,
  effect,
  inject,
  OnDestroy,
  signal,
  untracked,
} from "@angular/core";
import { Song } from "../models/song.model";
import {
  PlayerStatus,
  RepeatMode,
} from "../../features/player/models/player.model";
import { SettingsService } from "./settings.service";
import { PlaylistService } from "./playlist.service";
import { OfflineStorageService } from "../../features/library/services/offline-storage.service";
import { AudioService } from "./audio.service";
import { HapticsService } from "./haptics.service";
import { upgradeToHttps } from "../utils/utils";

/** Cap consecutive dead tracks so a broken queue can't spin forever. */
const MAX_ERROR_SKIPS = 10;

@Injectable({
  providedIn: "root",
})
export class PlayerService implements OnDestroy {
  private readonly settingsService = inject(SettingsService);
  private readonly playlistService = inject(PlaylistService);
  private readonly offlineStorageService = inject(OfflineStorageService);
  private readonly audioService = inject(AudioService);
  private readonly haptics = inject(HapticsService);
  private currentObjectUrl: string | null = null;
  private handlingSongEnded = false;
  private handlingSongError = false;
  /** True only when advancing the queue (ended / next / prev) — not a user pick. */
  private allowErrorSkip = false;
  private consecutiveErrorSkips = 0;
  readonly status = this.audioService.status;
  readonly currentTime = this.audioService.currentTime;
  readonly duration = this.audioService.duration;
  /** Short user-facing reason while status === Error. */
  readonly playError = signal("");

  constructor() {
    effect(() => {
      if (this.status() === PlayerStatus.Ended && !this.handlingSongEnded) {
        this.handlingSongEnded = true;
        untracked(() => {
          this.handleSongEnded().finally(() => {
            this.handlingSongEnded = false;
          });
        });
      }
    });
    effect(() => {
      const status = this.status();
      if (status === PlayerStatus.Playing) {
        untracked(() => {
          this.playError.set("");
          this.allowErrorSkip = false;
          this.consecutiveErrorSkips = 0;
          this.haptics.clearWarn();
        });
        return;
      }
      if (status === PlayerStatus.Error) {
        untracked(() => {
          if (!this.playError()) {
            this.playError.set("Couldn't play this track");
          }
          if (!this.handlingSongError && this.allowErrorSkip) {
            this.handlingSongError = true;
            this.handleSongError().finally(() => {
              this.handlingSongError = false;
            });
          } else if (!this.allowErrorSkip && !this.handlingSongError) {
            // User-picked / exhausted skip — soft warn once, never on each auto-skip.
            const key = this.playlistService.currentSong()?.link ?? "";
            this.haptics.warnOnce(key);
          }
        });
      }
    });
  }

  private async handleSongEnded(): Promise<void> {
    const mode = this.settingsService.repeatMode();
    if (mode === RepeatMode.ONE) {
      await this.replayCurrentSong();
      return;
    }
    const nextSong = this.playlistService.next();
    if (nextSong) {
      await this.setSong(nextSong, { fromQueue: true });
    } else if (mode === RepeatMode.ALL) {
      this.playlistService.jumpToIndex(0);
      const firstSong = this.playlistService.currentSong();
      if (firstSong) await this.setSong(firstSong, { fromQueue: true });
    } else {
      this.audioService.pause();
      this.audioService.seek(0);
    }
  }

  /** Queue advance hit a dead URL — skip ahead. User picks stay on Error. */
  private async handleSongError(): Promise<void> {
    const budget = Math.min(
      MAX_ERROR_SKIPS,
      Math.max(1, this.playlistService.queueLength()),
    );
    while (
      this.allowErrorSkip &&
      this.status() === PlayerStatus.Error &&
      this.consecutiveErrorSkips < budget
    ) {
      this.consecutiveErrorSkips++;
      const advanced = await this.setNextSong();
      if (!advanced) break;
    }
    if (this.status() === PlayerStatus.Error) {
      this.allowErrorSkip = false;
      this.consecutiveErrorSkips = 0;
      if (!this.playError()) {
        this.playError.set("Couldn't play this track");
      }
    }
  }

  async setSong(
    song: Song,
    opts?: { fromQueue?: boolean },
  ): Promise<void> {
    this.cleanupObjectUrl();
    this.handlingSongEnded = false;
    this.playError.set("");
    // Search / explore / vault click → stay on Error. Queue advance → auto-skip.
    this.allowErrorSkip = opts?.fromQueue === true;
    this.playlistService.setCurrentSong(song);
    this.audioService.pause();
    this.audioService.seek(0);
    const secureLink = upgradeToHttps(song.link);
    const offlineResponse =
      await this.offlineStorageService.isAvailableOffline(secureLink);
    if (offlineResponse) {
      const blob = await offlineResponse.blob();
      this.currentObjectUrl = URL.createObjectURL(blob);
      this.audioService.setSource(this.currentObjectUrl);
    } else if (this.settingsService.isNavigatorOffline()) {
      this.playError.set("Not available offline");
      this.audioService.fail();
      return;
    } else {
      // API-down is fine: stream from CDN / service worker cache.
      this.audioService.setSource(secureLink);
    }
    await this.audioService.play();
  }

  /** Retry hard-reloads the current track when we're on Error/Ended. */
  async play(): Promise<void> {
    const status = this.status();
    if (status === PlayerStatus.Error || status === PlayerStatus.Ended) {
      const song = this.playlistService.currentSong();
      if (song) {
        await this.setSong(song);
        return;
      }
    }
    await this.audioService.play();
  }

  pause(): void {
    this.audioService.pause();
  }
  seek(time: number): void {
    this.audioService.seek(time);
  }
  /** Flip shuffle and rebuild the queue around the current track. */
  toggleShuffle(): void {
    this.settingsService.toggleShuffle();
    if (this.settingsService.isShuffle()) {
      this.playlistService.enableShuffle();
    } else {
      this.playlistService.disableShuffle();
    }
  }
  toggleRepeat(): void {
    this.settingsService.toggleRepeat();
  }
  async setPreviousSong(): Promise<Song | undefined> {
    if (this.currentTime() > 5) {
      return this.replayCurrentSong();
    }
    const previousSong = this.playlistService.previous();
    if (previousSong) {
      await this.setSong(previousSong, { fromQueue: true });
      return previousSong;
    } else if (this.settingsService.repeatMode() === RepeatMode.ALL) {
      const length = this.playlistService.queueLength();
      if (length > 0) {
        this.playlistService.jumpToIndex(length - 1);
        const lastSong = this.playlistService.currentSong();
        if (lastSong) {
          await this.setSong(lastSong, { fromQueue: true });
          return lastSong;
        }
      }
    }
    return undefined;
  }
  async setNextSong(): Promise<Song | undefined> {
    const nextSong = this.playlistService.next();
    if (nextSong) {
      await this.setSong(nextSong, { fromQueue: true });
      return nextSong;
    } else if (this.settingsService.repeatMode() === RepeatMode.ALL) {
      this.playlistService.jumpToIndex(0);
      const firstSong = this.playlistService.currentSong();
      if (firstSong) {
        await this.setSong(firstSong, { fromQueue: true });
        return firstSong;
      }
    }
    return undefined;
  }
  private async replayCurrentSong(): Promise<undefined> {
    this.audioService.seek(0);
    // Repeat One must not inherit queue-skip — replay is a deliberate stay.
    this.allowErrorSkip = false;
    await this.audioService.play();
    return undefined;
  }
  private cleanupObjectUrl(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }
  reset(): void {
    this.audioService.pause();
    this.audioService.setSource("");
    this.playlistService.reset();
    this.cleanupObjectUrl();
    this.allowErrorSkip = false;
    this.consecutiveErrorSkips = 0;
    this.playError.set("");
  }
  ngOnDestroy(): void {
    this.cleanupObjectUrl();
  }
}
