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
import { RecentService } from "../../features/recent/services/recent.service";
import { PlaylistService } from "./playlist.service";
import { OfflineStorageService } from "../../features/library/services/offline-storage.service";
import { AudioService } from "./audio.service";
import { upgradeToHttps } from "../utils/utils";

@Injectable({
  providedIn: "root",
})
export class PlayerService implements OnDestroy {
  private readonly settingsService = inject(SettingsService);
  private readonly recentService = inject(RecentService);
  private readonly playlistService = inject(PlaylistService);
  private readonly offlineStorageService = inject(OfflineStorageService);
  private readonly audioService = inject(AudioService);

  private readonly alreadyAddedInRecents = signal<boolean>(false);
  private currentObjectUrl: string | null = null;

  readonly song = computed(() => this.playlistService.currentSong());
  readonly status = this.audioService.status;
  readonly currentTime = this.audioService.currentTime;
  readonly duration = this.audioService.duration;
  readonly progress = computed(() => {
    const currentTime = this.currentTime();
    const duration = this.duration();
    return duration > 0 ? (currentTime / duration) * 100 : 0;
  });

  constructor() {
    effect(() => {
      const time = this.currentTime();
      const song = this.song();

      if (time > 7 && !this.alreadyAddedInRecents() && song) {
        this.alreadyAddedInRecents.set(true);
        this.recentService.addSongToRecents(song);
      }
    });

    effect(() => {
      const status = this.status();
      if (status === PlayerStatus.Ended) {
        untracked(() => this.handleSongEnded());
      }
    });

    effect(() => {
      const isShuffle = this.settingsService.isShuffle();
      untracked(() => {
        if (isShuffle) {
          this.playlistService.enableShuffle();
        } else {
          this.playlistService.disableShuffle();
        }
      });
    });
  }

  private async handleSongEnded() {
    const mode = this.settingsService.repeatMode();

    if (mode === RepeatMode.ONE) {
      this.replayCurrentSong();
      return;
    }

    const nextSong = this.playlistService.next();

    if (nextSong) {
      await this.setSong(nextSong);
    } else if (mode === RepeatMode.ALL) {
      // Wrap around
      this.playlistService.jumpToIndex(0);
      const firstSong = this.playlistService.currentSong();
      if (firstSong) await this.setSong(firstSong);
    } else {
      // OFF mode and reached the end
      this.audioService.pause();
      this.audioService.seek(0);
    }
  }

  async setSong(song: Song): Promise<void> {
    this.cleanupObjectUrl();

    this.playlistService.setCurrentSong(song);
    this.audioService.pause();
    this.audioService.seek(0);
    this.alreadyAddedInRecents.set(false);

    const secureLink = upgradeToHttps(song.link);

    const offlineResponse =
      await this.offlineStorageService.isAvailableOffline(secureLink);

    if (offlineResponse) {
      const blob = await offlineResponse.blob();
      this.currentObjectUrl = URL.createObjectURL(blob);
      this.audioService.setSource(this.currentObjectUrl);
    } else {
      if (this.settingsService.isOffline()) {
        this.audioService.setSource("");
        return;
      }
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
    this.alreadyAddedInRecents.set(false);
    this.cleanupObjectUrl();
  }

  ngOnDestroy(): void {
    this.cleanupObjectUrl();
  }
}
