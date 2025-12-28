import { Injectable, signal } from '@angular/core';
import { bytesToGB } from '../../../core/utils/utils';
import { Song } from '../../../core/models/song.model';

@Injectable({
  providedIn: 'root',
})
export class OfflineStorageService {
  storageTotal = signal<number>(0);
  storageUsed = signal<number>(0);

  private _currentLoadingDownloadSongIds = signal<string[]>([]);
  private _availableOfflineSongIds = signal<string[]>([]);

  currentLoadingDownloadSongIds = this._currentLoadingDownloadSongIds.asReadonly();
  availableOfflineSongIds = this._availableOfflineSongIds.asReadonly();

  async setUpStorage() {
    const data = await navigator.storage.estimate();
    this.storageTotal.set(bytesToGB(data.quota!));
    this.storageUsed.set(bytesToGB(data.usage!));
  }

  async cacheAllSongs(songs: Song[]) {
    const cachedLibrary = await caches.open('library');
    for (const song of songs) {
      const isAvailable = await this.isAvalaibleOffline(
        song.link,
        cachedLibrary
      );
      if (isAvailable) continue;

      this._currentLoadingDownloadSongIds.update((prev) => [...prev, song.id]);
      try {
        await this.cacheSong(song, cachedLibrary);
        await this.setUpStorage();
        this._availableOfflineSongIds.update((prev) => [...prev, song.id]);
      } catch (error) {
      } finally {
        this._currentLoadingDownloadSongIds.update((prev) =>
          prev.filter((id) => id !== song.id)
        );
      }
    }
  }

  async cacheSong(song: Song, cachedLibrary: Cache | null = null) {
    if (!cachedLibrary) {
      cachedLibrary = await caches.open('library');
    }

    await cachedLibrary.add(song.link);
  }

  async isAvalaibleOffline(
    songLink: string,
    cachedLibrary: Cache | null = null
  ) {
    if (!cachedLibrary) {
      cachedLibrary = await caches.open('library');
    }

    return await cachedLibrary.match(songLink);
  }

  async removeCache() {
    await caches.delete('library');
    setTimeout(async () => {
      await this.setUpStorage();
    }, 500);
  }

  emptyAvailableOfflineSongIds() {
    this._availableOfflineSongIds.set([]);
  }

  addAvailableOfflineSongId(songId: string) {
    if (!this._availableOfflineSongIds().includes(songId)) {
      this._availableOfflineSongIds.update((prev) => [...prev, songId]);
    }
  }

  async removeOneSongFromAvailableOfflineSongIds(
    songId: string,
    songLink: string
  ) {
    const songCache = await caches.open('library');
    await songCache.delete(songLink);

    this._availableOfflineSongIds.update((prev) =>
      prev.filter((id) => id !== songId)
    );
  }
}
