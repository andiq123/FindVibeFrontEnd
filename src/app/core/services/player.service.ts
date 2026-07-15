import {
  computed,
  Injectable,
  signal,
  effect,
  inject,
  OnDestroy,
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
import { upgradeToHttps } from "../utils/utils";
@Injectable({
  providedIn: "root",
})
export class PlayerService implements OnDestroy {
  private readonly settingsService = inject(SettingsService);
  private readonly playlistService = inject(PlaylistService);
  private readonly offlineStorageService = inject(OfflineStorageService);
  private readonly audioService = inject(AudioService);
  private currentObjectUrl: string | null = null;
  private handlingSongEnded = false;
  readonly status = this.audioService.status;
  readonly currentTime = this.audioService.currentTime;
  readonly duration = this.audioService.duration;
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
  }
  private async handleSongEnded(): Promise<void> {
    const mode = this.settingsService.repeatMode();
    if (mode === RepeatMode.ONE) {
      await this.replayCurrentSong();
      return;
    }
    const nextSong = this.playlistService.next();
    if (nextSong) {
      await this.setSong(nextSong);
    } else if (mode === RepeatMode.ALL) {
      this.playlistService.jumpToIndex(0);
      const firstSong = this.playlistService.currentSong();
      if (firstSong) await this.setSong(firstSong);
    } else {
      this.audioService.pause();
      this.audioService.seek(0);
    }
  }
  async setSong(song: Song): Promise<void> {
    this.cleanupObjectUrl();
    this.handlingSongEnded = false;
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
      // Device offline + not in vault — don't fake an empty play → Error.
      this.audioService.setSource("");
      return;
    } else {
      // API-down is fine: stream from CDN / service worker cache.
      this.audioService.setSource(secureLink);
    }
    await this.audioService.play();
  }
  async play(): Promise<void> {
    await this.audioService.play();
  }
  pause(): void {
    this.audioService.pause();
  }
  seek(time: number): void {
    this.audioService.seek(time);
  }
  async setPreviousSong(): Promise<Song | undefined> {
    if (this.currentTime() > 5) {
      return this.replayCurrentSong();
    }
    const previousSong = this.playlistService.previous();
    if (previousSong) {
      await this.setSong(previousSong);
      return previousSong;
    } else if (this.settingsService.repeatMode() === RepeatMode.ALL) {
      const length = this.playlistService.queueLength();
      if (length > 0) {
        this.playlistService.jumpToIndex(length - 1);
        const lastSong = this.playlistService.currentSong();
        if (lastSong) {
          await this.setSong(lastSong);
          return lastSong;
        }
      }
    }
    return undefined;
  }
  async setNextSong(): Promise<Song | undefined> {
    const nextSong = this.playlistService.next();
    if (nextSong) {
      await this.setSong(nextSong);
      return nextSong;
    } else if (this.settingsService.repeatMode() === RepeatMode.ALL) {
      this.playlistService.jumpToIndex(0);
      const firstSong = this.playlistService.currentSong();
      if (firstSong) {
        await this.setSong(firstSong);
        return firstSong;
      }
    }
    return undefined;
  }
  private async replayCurrentSong(): Promise<undefined> {
    this.audioService.seek(0);
    await this.play();
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
  }
  ngOnDestroy(): void {
    this.cleanupObjectUrl();
  }
}
