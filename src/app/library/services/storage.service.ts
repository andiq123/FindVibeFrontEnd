import { Injectable, Signal, signal } from '@angular/core';
import { addHerokutoLink, convertKbToGb } from '../../utils/utils';
import { Song } from '../../songs/models/song.model';
import { LibraryService } from './library.service';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  storageTotal = signal<number>(0);
  storageUsed = signal<number>(0);

  songs!: Signal<Song[]>;

  constructor(private libraryService: LibraryService) {
    this.songs = libraryService.songs$;
  }

  setUpStorage() {
    navigator.storage.estimate().then((data) => {
      this.storageTotal.set(convertKbToGb(data.quota!));
      this.storageUsed.set(convertKbToGb(data.usage!));
    });
  }

  async cacheAllSongs() {
    const cachedLibrary = await caches.open('library');

    this.songs().forEach(async (song) => {
      const proxiedUrl = addHerokutoLink(song.link);

      const response = await fetch(proxiedUrl, {
        method: 'GET',
        headers: {
          Origin: window.location.origin,
        },
      });
      await cachedLibrary.add(response.url);

      this.libraryService.setSongDownloaded(song.id);

      this.setUpStorage();
    });
  }

  async removeCache() {
    await caches.delete('library');
  }
}
