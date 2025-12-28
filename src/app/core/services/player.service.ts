import { computed, Injectable, signal, effect, inject, OnDestroy } from '@angular/core';
import { Song } from '../models/song.model';
import { SettingsService } from './settings.service';
import { RecentService } from '../../features/recent/services/recent.service';
import { PlaylistService } from './playlist.service';
import { OfflineStorageService } from '../../features/library/services/offline-storage.service';
import { AudioService } from './audio.service';

@Injectable({
  providedIn: 'root',
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

  private readonly recentsEffect = effect(() => {
    const time = this.currentTime();
    const song = this.song();

    if (time > 7 && !this.alreadyAddedInRecents() && song) {
      this.alreadyAddedInRecents.set(true);
      this.recentService.addSongToRecents(song);
    }
  });

  private readonly shuffleEffect = effect(() => {
    if (this.settingsService.isShuffle()) {
      this.playlistService.enableShuffle();
    } else {
      this.playlistService.disableShuffle();
    }
  });

  async setSong(song: Song): Promise<void> {
    this.cleanupObjectUrl();

    this.playlistService.setCurrentSong(song);
    this.audioService.pause();
    this.audioService.seek(0);
    this.alreadyAddedInRecents.set(false);

    const offlineResponse = await this.offlineStorageService.isAvailableOffline(song.link);

    if (offlineResponse) {
      const blob = await offlineResponse.blob();
      this.currentObjectUrl = URL.createObjectURL(blob);
      this.audioService.setSource(this.currentObjectUrl);
    } else {
      if (this.settingsService.isOffline()) {
        this.audioService.setSource('');
        return;
      }
      this.audioService.setSource(song.link);
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
    if (this.playlistService.needToReplay(this.currentTime())) {
      this.audioService.seek(0);
      await this.play();
      return undefined;
    }

    const previousSong = this.playlistService.previous();
    if (previousSong) {
      await this.setSong(previousSong);
      return previousSong;
    }
    return undefined;
  }

  async setNextSong(): Promise<Song | undefined> {
    if (this.settingsService.isRepeat()) {
      this.audioService.seek(0);
      await this.play();
      return undefined;
    }

    const nextSong = this.playlistService.next();
    if (nextSong) {
      await this.setSong(nextSong);
      return nextSong;
    }
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
    this.audioService.setSource('');
    this.playlistService.reset();
    this.cleanupObjectUrl();
  }

  ngOnDestroy(): void {
    this.cleanupObjectUrl();
  }
}
