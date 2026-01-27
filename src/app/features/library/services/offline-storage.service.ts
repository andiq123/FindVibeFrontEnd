import { Injectable, signal, computed } from "@angular/core";
import { bytesToGB, upgradeToHttps } from "../../../core/utils/utils";
import { Song } from "../../../core/models/song.model";
import { inject } from "@angular/core";
import { StorageService } from "../../../core/services/storage.service";
import { trackLoadingState } from "../../../core/utils/loading-state.util";
const CACHE_NAME = "library-vault";
@Injectable({
  providedIn: "root",
})
export class OfflineStorageService {
  readonly storageTotal = signal<number>(0);
  readonly storageUsed = signal<number>(0);
  private readonly _currentLoadingDownloadSongIds = signal<string[]>([]);
  private readonly _availableOfflineSongIds = signal<string[]>([]);
  private readonly storageService = inject(StorageService);
  readonly currentLoadingDownloadSongIds =
    this._currentLoadingDownloadSongIds.asReadonly();
  readonly availableOfflineSongIds = this._availableOfflineSongIds.asReadonly();
  readonly isSyncing = computed(
    () => this._currentLoadingDownloadSongIds().length > 0,
  );
  private cachePromise?: Promise<Cache>;
  initialize(): void {
    this.setUpStorage();
    this.syncOfflineSongs();
  }
  async syncOfflineSongs(): Promise<void> {
    const songs = this.storageService.getItem<Song[]>("library") || [];
    if (!songs.length) return;
    const cache = await this.getCache();
    const availableIds: string[] = [];
    for (const song of songs) {
      const secureLink = upgradeToHttps(song.link);
      const match = await cache.match(secureLink);
      if (match) {
        availableIds.push(song.id);
      }
    }
    this._availableOfflineSongIds.set(availableIds);
  }
  async setUpStorage(): Promise<void> {
    try {
      if (!navigator.storage?.estimate) return;
      const { quota, usage } = await navigator.storage.estimate();
      this.storageTotal.set(bytesToGB(quota ?? 0));
      this.storageUsed.set(bytesToGB(usage ?? 0));
    } catch (error) {
      console.error("[OfflineStorage] Failed to estimate storage:", error);
    }
  }
  async cacheAllSongs(songs: Song[]): Promise<void> {
    const cache = await this.getCache();
    for (const song of songs) {
      const secureLink = upgradeToHttps(song.link);
      const exists = await this.isAvailableOffline(secureLink, cache);
      if (exists) continue;
      this.trackProgress(song.id, true);
      try {
        await cache.add(secureLink);
        this.addAvailableOfflineSongId(song.id);
        await this.setUpStorage();
      } catch (error) {
        console.error("Failed to cache song:", error);
      } finally {
        this.trackProgress(song.id, false);
      }
    }
  }
  async isAvailableOffline(
    songLink: string,
    existingCache?: Cache,
  ): Promise<Response | undefined> {
    const cache = existingCache ?? (await this.getCache());
    return await cache.match(songLink);
  }
  async removeCache(): Promise<void> {
    await caches.delete(CACHE_NAME);
    this.cachePromise = undefined;
    this.emptyAvailableOfflineSongIds();
    const maxRetries = 5;
    for (let i = 0; i < maxRetries; i++) {
      await this.setUpStorage();
      if (this.storageUsed() < 0.01) {
        break;
      }
    }
    await this.setUpStorage();
  }
  addAvailableOfflineSongId(songId: string): void {
    this._availableOfflineSongIds.update((ids) =>
      ids.includes(songId) ? ids : [...ids, songId],
    );
  }
  emptyAvailableOfflineSongIds(): void {
    this._availableOfflineSongIds.set([]);
  }
  async removeSongFromCache(songId: string, songLink: string): Promise<void> {
    try {
      const cache = await this.getCache();
      const secureLink = upgradeToHttps(songLink);
      await cache.delete(secureLink);
      this._availableOfflineSongIds.update((ids) =>
        ids.filter((id) => id !== songId),
      );
      await this.setUpStorage();
    } catch (error) {
      console.error("Failed to remove song from cache:", error);
    }
  }
  private getCache(): Promise<Cache> {
    if (!this.cachePromise) {
      this.cachePromise = caches.open(CACHE_NAME);
    }
    return this.cachePromise;
  }
  private trackProgress(id: string, isLoading: boolean): void {
    trackLoadingState(this._currentLoadingDownloadSongIds, id, isLoading);
  }
}
