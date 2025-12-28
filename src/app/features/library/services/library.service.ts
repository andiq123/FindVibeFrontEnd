import { computed, Injectable, signal, inject } from '@angular/core';
import { LibraryApiService } from './library-api.service';
import { tap } from 'rxjs';
import { Song } from '../../../core/models/song.model';
// removed SongToAddFavorite import
import { OfflineStorageService } from './offline-storage.service';
import { Reorder } from '../../../core/models/reorder.model';

@Injectable({
  providedIn: 'root',
})
export class LibraryService {
  private libraryApiService = inject(LibraryApiService);
  private offlineStorageService = inject(OfflineStorageService);

  songs = signal<Song[]>([]);
  
  orderHasChanged = computed(() => {
    const localSongs = this.libraryApiService.getLibraryFromLocalStorage();
    const currentSongs = this.songs();
    if (localSongs.length !== currentSongs.length) return true;
    
    // Performance optimization: fast check using some IDs
    for (let i = 0; i < currentSongs.length; i++) {
        if (currentSongs[i].id !== localSongs[i]?.id) return true;
    }
    return false;
  });

  currentLoadingFavoriteSongIds = signal<string[]>([]);

  updateLibrarySongs(userId: string) {
    return this.libraryApiService.getFavoritesSong(userId).pipe(
      tap({
        next: (songs: Song[]) => {
          this.songs.set(songs);
        },
      })
    );
  }

  addToFavorites(song: Song, userId: string) {
    this.addSongToLoadingFavorites(song.id);

    const composeOrder =
      this.songs().length === 0 ? 1 : this.songs().length + 1;

    const favoriteSong: Song = {
      ...song,
      order: composeOrder,
    };

    return this.libraryApiService.addToFavorites(favoriteSong, userId).pipe(
      tap({
        next: () => {
          this.songs.update((prevSongs: Song[]) => [...prevSongs, favoriteSong]);
          this.libraryApiService.setLibraryToLocalStorage([...this.songs()]);
          this.removeSongFromLoadingFavorites(song.id);
        },
        error: () => this.removeSongFromLoadingFavorites(song.id),
      })
    );
  }

  removeFromFavorites(id: string, link: string) {
    this.addSongToLoadingFavorites(id);
    const songId = this.songs().find((x: Song) => x.link === link)!.id;
    return this.libraryApiService.removeFromFavorites(songId).pipe(
      tap({
        next: async () => {
          await this.offlineStorageService.removeSongFromCache(
            id,
            link
          );
          this.songs.update((prevSongs: Song[]) =>
            prevSongs.filter((song: Song) => song.link !== link)
          );
          this.libraryApiService.setLibraryToLocalStorage([...this.songs()]);
          this.removeSongFromLoadingFavorites(id);
        },
        error: () => this.removeSongFromLoadingFavorites(id),
      })
    );
  }

  saveReorders() {
    const reorders: Reorder[] = this.songs().map((x: Song) => ({
      songId: x.id,
      order: x.order,
    }));
    return this.libraryApiService.reorderSongs(reorders).pipe(
      tap(() => {
        this.libraryApiService.setLibraryToLocalStorage([...this.songs()]);
        this.resetReorder();
      })
    );
  }

  changePlaces(id1: string, id2: string) {
    this.songs.update((prevSongs: Song[]) => {
      const song1 = prevSongs.find((x: Song) => x.id === id1)!;
      const song2 = prevSongs.find((x: Song) => x.id === id2)!;

      const index1 = prevSongs.findIndex((x: Song) => x.id === id1);
      const index2 = prevSongs.findIndex((x: Song) => x.id === id2);

      prevSongs[index1] = song2;
      prevSongs[index2] = song1;
      return prevSongs.map((song: Song, i: number) => ({ ...song, order: i + 1 }));
    });
  }

  resetReorder() {
    const songs = this.libraryApiService
      .getLibraryFromLocalStorage()
      .sort((a: Song, b: Song) => a.order - b.order);
    this.songs.set(songs);
  }

  private addSongToLoadingFavorites(id: string) {
    this.currentLoadingFavoriteSongIds.update((prevSongIds: string[]) =>
      prevSongIds.includes(id) ? prevSongIds : [...prevSongIds, id]
    );
  }

  private removeSongFromLoadingFavorites(id: string) {
    this.currentLoadingFavoriteSongIds.update((prevSongIds: string[]) =>
      prevSongIds.filter((songId: string) => songId !== id)
    );
  }
}
