import { Injectable, Signal, signal } from '@angular/core';
import { addHerokutoLink, bytesToGB, delayCustom } from '../../utils/utils';
import { Song } from '../../songs/models/song.model';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  storageTotal = signal<number>(0);
  storageUsed = signal<number>(0);

  currentLoadingDownloadSongIds$ = signal<string[]>([]);
  availableOfflineSongIds$ = signal<string[]>([]);

  constructor() {}

  async setUpStorage() {
    const data = await navigator.storage.estimate();
    this.storageTotal.set(bytesToGB(data.quota!));
    this.storageUsed.set(bytesToGB(data.usage!));
  }

  async cacheAllSongs(songs: Song[]) {
    const cachedLibrary = await caches.open('library');

    for (const song of songs) {
      if (await this.isAvalaibleOffline(song.link)) continue;

      const proxiedUrl = addHerokutoLink(song.link);

      this.currentLoadingDownloadSongIds$.update((prev) => [...prev, song.id]);
      const response = await fetch(proxiedUrl, {
        method: 'GET',
        headers: {
          Origin: window.location.origin,
        },
      });
      await cachedLibrary.add(new Request(response.url));

      await this.setUpStorage();

      await delayCustom(500);

      this.currentLoadingDownloadSongIds$.update((prev) =>
        prev.filter((id) => id !== song.id)
      );

      this.availableOfflineSongIds$.update((prev) => [...prev, song.id]);
    }
  }

  async removeCache() {
    await caches.delete('library');
    setTimeout(async () => {
      await this.setUpStorage();
    }, 500);
  }

  async isAvalaibleOffline(songLink: string) {
    const songCache = await caches.open('library');
    const proxiedUrl = addHerokutoLink(songLink);
    const isAvailable = await songCache.match(proxiedUrl);
    return !!isAvailable?.url;
  }

  emptyAvailableOfflineSongIds() {
    this.availableOfflineSongIds$.set([]);
  }
}
