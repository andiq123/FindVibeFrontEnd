import { Injectable, signal, computed } from '@angular/core';
import { bytesToGB } from '../../../core/utils/utils';
import { Song } from '../../../core/models/song.model';
import { inject } from '@angular/core';
import { LibraryApiService } from './library-api.service';

const CACHE_NAME = 'library-vault';

@Injectable({
  providedIn: 'root',
})
export class OfflineStorageService {
  readonly storageTotal = signal<number>(0);
  readonly storageUsed = signal<number>(0);

  private readonly _currentLoadingDownloadSongIds = signal<string[]>([]);
  private readonly _availableOfflineSongIds = signal<string[]>([]);
  private readonly libraryApiService = inject(LibraryApiService);

  readonly currentLoadingDownloadSongIds = this._currentLoadingDownloadSongIds.asReadonly();
  readonly availableOfflineSongIds = this._availableOfflineSongIds.asReadonly();

  readonly isSyncing = computed(() => this._currentLoadingDownloadSongIds().length > 0);

  private cachePromise?: Promise<Cache>;

  initialize(): void {
    this.setUpStorage();
    this.syncOfflineSongs();
  }

  async syncOfflineSongs(): Promise<void> {
    const songs = this.libraryApiService.getLibraryFromLocalStorage();
    if (!songs.length) return;

    const cache = await this.getCache();
    const availableIds: string[] = [];

    for (const song of songs) {
      const match = await cache.match(song.link);
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
      console.error('[OfflineStorage] Failed to estimate storage:', error);
    }
  }

  async cacheAllSongs(songs: Song[]): Promise<void> {
    const cache = await this.getCache();

    for (const song of songs) {
      const exists = await this.isAvailableOffline(song.link, cache);
      if (exists) continue;

      this.trackProgress(song.id, true);

      try {
        await cache.add(song.link);
        this.addAvailableOfflineSongId(song.id);
        await this.setUpStorage();
      } catch {

      } finally {
        this.trackProgress(song.id, false);
      }
    }
  }

  async isAvailableOffline(songLink: string, existingCache?: Cache): Promise<Response | undefined> {
    const cache = existingCache ?? await this.getCache();
    return await cache.match(songLink);
  }

  async removeCache(): Promise<void> {
    await caches.delete(CACHE_NAME);
    this.cachePromise = undefined;
    this.emptyAvailableOfflineSongIds();
    const maxRetries = 5;
    const delayMs = 500;

    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      await this.setUpStorage();

      if (this.storageUsed() < 0.01) {
        break;
      }
    }

    await this.setUpStorage();
  }

  addAvailableOfflineSongId(songId: string): void {
    this._availableOfflineSongIds.update(ids => 
      ids.includes(songId) ? ids : [...ids, songId]
    );
  }

  emptyAvailableOfflineSongIds(): void {
    this._availableOfflineSongIds.set([]);
  }

  async removeSongFromCache(songId: string, songLink: string): Promise<void> {
    try {
      const cache = await this.getCache();
      await cache.delete(songLink);

      this._availableOfflineSongIds.update(ids => ids.filter(id => id !== songId));
      await this.setUpStorage();
    } catch {

    }
  }

  private getCache(): Promise<Cache> {
    if (!this.cachePromise) {
      this.cachePromise = caches.open(CACHE_NAME);
    }
    return this.cachePromise;
  }

  private trackProgress(id: string, isLoading: boolean): void {
    this._currentLoadingDownloadSongIds.update((prevIds: string[]) =>
      isLoading 
        ? (prevIds.includes(id) ? prevIds : [...prevIds, id])
        : prevIds.filter((songId: string) => songId !== id)
    );
  }
}
