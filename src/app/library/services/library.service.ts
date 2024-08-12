import { computed, Injectable, signal } from '@angular/core';
import { LibraryBackService } from './library-back.service';
import { tap } from 'rxjs';
import { Song } from '../../songs/models/song.model';
import { SongToAddFavorite } from '../models/songToAddFavorite.model';
import { StorageService } from './storage.service';
import { Reorder } from '../models/reorder.model';

@Injectable({
  providedIn: 'root',
})
export class LibraryService {
  songs$ = signal<Song[]>([]);
  orderHasChanged = computed(() => {
    const songsFromLocal = this.libraryBackService.getLibraryFromLocalStorage();
    const songs = this.songs$();
    for (let i = 0; i < songsFromLocal.length; i++) {
      if (songsFromLocal[i].id !== songs[i].id) {
        return true;
      }
    }

    return false;
  });

  currentLoadingFavoriteSongIds$ = signal<string[]>([]);

  constructor(
    private libraryBackService: LibraryBackService,
    private storageService: StorageService
  ) {}

  updateLibrarySongs(userId: string) {
    return this.libraryBackService.getFavoritesSong(userId).pipe(
      tap({
        next: (data) => {
          this.songs$.set(data.songs);
        },
      })
    );
  }

  addToFavorites(song: Song, userId: string) {
    this.addSongToLoadingFavorites(song.id);

    const composeOrder =
      this.songs$().length === 0 ? 1 : this.songs$().length + 1;

    const favoriteSong: SongToAddFavorite = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      image: song.image,
      link: song.link,
      userId: userId,
      order: composeOrder,
    };

    return this.libraryBackService.addToFavorites(favoriteSong).pipe(
      tap({
        next: () => {
          this.songs$.update((prevSongs) => [...prevSongs, song]);
          this.libraryBackService.setLibraryToLocalStorage([...this.songs$()]);
          this.removeSongFromLoadingFavorites(song.id);
        },
      })
    );
  }

  removeFromFavorites(id: string, link: string) {
    this.addSongToLoadingFavorites(id);
    const songId = this.songs$().find((x) => x.link === link)!.id;
    return this.libraryBackService.removeFromFavorites(songId).pipe(
      tap({
        next: async () => {
          await this.storageService.removeOneSongFromAvailableOfflineSongIds(
            id,
            link
          );
          this.songs$.update((prevSongs) =>
            prevSongs.filter((song) => song.link !== link)
          );
          this.libraryBackService.setLibraryToLocalStorage([...this.songs$()]);
          this.removeSongFromLoadingFavorites(id);
        },
      })
    );
  }

  saveReorders() {
    const reorders: Reorder[] = this.songs$().map((x) => ({
      songId: x.id,
      order: x.order,
    }));
    return this.libraryBackService.reorderSongs(reorders).pipe(
      tap(() => {
        this.libraryBackService.setLibraryToLocalStorage([...this.songs$()]);
        this.resetReorder();
      })
    );
  }

  changePlaces(id1: string, id2: string) {
    this.songs$.update((prevSongs) => {
      const song1 = prevSongs.find((x) => x.id === id1)!;
      const song2 = prevSongs.find((x) => x.id === id2)!;

      const index1 = prevSongs.findIndex((x) => x.id === id1);
      const index2 = prevSongs.findIndex((x) => x.id === id2);

      prevSongs[index1] = song2;
      prevSongs[index2] = song1;
      return prevSongs.map((song, i) => ({ ...song, order: i + 1 }));
    });
  }

  resetReorder() {
    const songs = this.libraryBackService
      .getLibraryFromLocalStorage()
      .sort((a, b) => a.order - b.order);
    this.songs$.set(songs);
  }

  private addSongToLoadingFavorites(id: string) {
    this.currentLoadingFavoriteSongIds$.update((prevSongIds) =>
      prevSongIds.includes(id) ? prevSongIds : [...prevSongIds, id]
    );
  }

  private removeSongFromLoadingFavorites(id: string) {
    this.currentLoadingFavoriteSongIds$.update((prevSongIds) =>
      prevSongIds.filter((songId) => songId !== id)
    );
  }
}
