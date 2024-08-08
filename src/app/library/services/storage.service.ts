import { Injectable, Signal, signal } from '@angular/core';
import { addHerokutoLink, bytesToGB, delayCustom } from '../../utils/utils';
import { Song } from '../../songs/models/song.model';
import { LibraryService } from './library.service';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  storageTotal = signal<number>(0);
  storageUsed = signal<number>(0);

  private currentLoadingDownloadSongIds = signal<string[]>([]);
  currentLoadingDownloadSongIds$ =
    this.currentLoadingDownloadSongIds.asReadonly();

  constructor() {}

  async setUpStorage() {
    const data = await navigator.storage.estimate();
    this.storageTotal.set(bytesToGB(data.quota!));
    this.storageUsed.set(bytesToGB(data.usage!));
  }

  async cacheAllSongs(songs: Song[]) {
    const cachedLibrary = await caches.open('library');
    const song = songs[0];
    const proxiedUrl = addHerokutoLink(song.link);

    const response = await fetch(proxiedUrl, {
      method: 'GET',
      headers: {
        Origin: window.location.origin,
      },
    });
    await cachedLibrary.add(response.url);

    await this.setUpStorage();

    song.downloaded = true;
    await delayCustom(500);
  }

  async removeCache() {
    await caches.delete('library');
    setTimeout(async () => {
      await this.setUpStorage();
    }, 500);
  }
}
