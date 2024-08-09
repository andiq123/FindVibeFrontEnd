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

  changePlaces(id1: string, id2: string) {
    const index1 = this.songs$().findIndex((x) => x.id === id1);
    const index2 = this.songs$().findIndex((x) => x.id === id2);

    if (index1 === -1 || index2 === -1) {
      return;
    }

    const song1 = this.songs$()[index1];
    const song2 = this.songs$()[index2];

    this.songs$.update((prevSongs) => {
      const orderAux = song2.order;
      song2.order = song1.order;
      song1.order = orderAux;

      prevSongs[index1] = song2;
      prevSongs[index2] = song1;
      return prevSongs;
    });

    this.libraryBackService.setLibraryToLocalStorage([...this.songs$()]);

    const reorders: Reorder[] = this.songs$().map((song) => ({
      songId: song.id,
      order: song.order,
    }));

    this.libraryBackService.reorderSongs(reorders).subscribe();
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
