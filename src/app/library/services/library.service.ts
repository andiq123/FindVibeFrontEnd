import { Injectable, signal } from '@angular/core';

import { LibraryBackService } from './library-back.service';

import { catchError, of, tap } from 'rxjs';
import { Song } from '../../songs/models/song.model';
import { SongToAddFavorite } from '../models/songToAddFavorite.model';
import { StorageService } from './storage.service';
import { Reorder } from '../models/reorder.model';

@Injectable({
  providedIn: 'root',
})
export class LibraryService {
  songs$ = signal<Song[]>([]);
  reorders = signal<Reorder[]>([]);

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

  getPreviousSong(currentSongId: string): Song {
    const songIndex = this.songs$().findIndex(
      (song) => song.id === currentSongId
    );

    if (songIndex === -1) {
      return this.songs$()[0];
    }

    return this.songs$()[
      (songIndex - 1 + this.songs$().length) % this.songs$().length
    ];
  }

  getNextSong(currentSongId: string): Song {
    const songIndex = this.songs$().findIndex(
      (song) => song.id === currentSongId
    );

    if (songIndex === -1) {
      return this.songs$()[0];
    }

    return this.songs$()[(songIndex + 1) % this.songs$().length];
  }

  getRandomSongFromCurrentPlaylist(): Song {
    return this.songs$()[Math.floor(Math.random() * this.songs$().length)];
  }

  saveReorders() {
    return this.libraryBackService.reorderSongs(this.reorders()).pipe(
      tap(() => {
        this.libraryBackService.setLibraryToLocalStorage([...this.songs$()]);
      })
    );
  }

  changePlaces(id1: string, id2: string) {
    const reorderedSongs = this.songs$();

    const song1 = reorderedSongs.find((song) => song.id === id1)!;
    const song2 = reorderedSongs.find((song) => song.id === id2)!;

    const reorders: Reorder[] = [
      { songId: id1, order: song2.order },
      { songId: id2, order: song1.order },
    ];

    this.addReorders(reorders);

    this.reorderSongs();
    console.log(this.songs$());
  }

  emptyReorders(isCancel = false) {
    this.reorders.set([]);
    if (isCancel) {
      const songs = this.libraryBackService
        .getLibraryFromLocalStorage()
        .sort((a, b) => a.order - b.order);
      this.songs$.set(songs);
    }
  }

  private reorderSongs() {
    this.songs$.update((prevSongs) => {
      return prevSongs
        .map((x) => {
          const reorder = this.reorders().find(
            (reorder) => reorder.songId === x.id
          );
          if (reorder) {
            x.order = reorder.order;
          }
          return x;
        })
        .sort((a, b) => a.order - b.order);
    });
  }

  private addReorders(reorders: Reorder[]) {
    this.reorders.update((prevReorders) => [...prevReorders, ...reorders]);
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
