import { Injectable, signal } from '@angular/core';
import { addProxyLink, bytesToGB, delayCustom } from '../../utils/utils';
import { Song } from '../../songs/models/song.model';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  storageTotal = signal<number>(0);
  storageUsed = signal<number>(0);

  currentLoadingDownloadSongIds$ = signal<string[]>([]);
  availableOfflineSongIds$ = signal<string[]>([]);

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

      this.currentLoadingDownloadSongIds$.update((prev) => [...prev, song.id]);
      await this.cacheSong(song, cachedLibrary);

      await this.setUpStorage();

      await delayCustom(1000);

      this.currentLoadingDownloadSongIds$.update((prev) =>
        prev.filter((id) => id !== song.id)
      );

      this.availableOfflineSongIds$.update((prev) => [...prev, song.id]);
    }
  }

  async cacheSong(song: Song, cachedLibrary: Cache | null = null) {
    if (!cachedLibrary) {
      cachedLibrary = await caches.open('library');
    }

    const proxiedUrl = addProxyLink(song.link);
    await cachedLibrary.add(proxiedUrl);
  }

  async removeCache() {
    await caches.delete('library');
    setTimeout(async () => {
      await this.setUpStorage();
    }, 500);
  }

  async isAvalaibleOffline(
    songLink: string,
    cachedLibrary: Cache | null = null
  ) {
    if (!cachedLibrary) {
      cachedLibrary = await caches.open('library');
    }
    const songCache = await caches.open('library');
    const proxiedUrl = addProxyLink(songLink);
    return await songCache.match(proxiedUrl);
  }

  emptyAvailableOfflineSongIds() {
    this.availableOfflineSongIds$.set([]);
  }

  async removeOneSongFromAvailableOfflineSongIds(
    songId: string,
    songLink: string
  ) {
    const songCache = await caches.open('library');
    const proxiedUrl = addProxyLink(songLink);

    await songCache.delete(proxiedUrl);

    this.availableOfflineSongIds$.update((prev) =>
      prev.filter((id) => id !== songId)
    );
  }
}
