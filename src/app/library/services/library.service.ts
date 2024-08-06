import { effect, Injectable, signal } from '@angular/core';

import { LibraryBackService } from './library-back.service';

import { catchError, tap } from 'rxjs';
import { Song } from '../../songs/models/song.model';
import { SongToAddFavorite } from '../models/songToAddFavorite.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class LibraryService {
  private songs = signal<Song[]>([]);
  songs$ = this.songs.asReadonly();
  private loadingSongs = signal<boolean>(false);
  loadingSongs$ = this.loadingSongs.asReadonly();

  private currentLoadingFavoriteSongIds = signal<string[]>([]);
  currentLoadingFavoriteSongIds$ =
    this.currentLoadingFavoriteSongIds.asReadonly();

  constructor(private libraryBackService: LibraryBackService) {}

  setupLibrarySongs(userId: string) {
    this.loadingSongs.set(true);
    return this.libraryBackService.getFavoritesSong(userId).pipe(
      tap((songs) => {
        this.songs.set(songs.songs);
        this.loadingSongs.set(false);
      }),
      catchError((err) => {
        this.songs.set([]);
        this.loadingSongs.set(false);
        throw err;
      })
    );
  }

  updateSilentLibrarySongs(userId: string) {
    return this.libraryBackService.getFavoritesSong(userId).pipe(
      tap((songs) => {
        this.songs.set(songs.songs);
      })
    );
  }

  addToFavorites(song: Song, userId: string) {
    this.addSongToLoadingFavorites(song.id);

    const favoriteSong: SongToAddFavorite = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      image: song.image,
      link: song.link,
      userId: userId,
    };

    return this.libraryBackService.addToFavorites(favoriteSong).pipe(
      tap(() => {
        this.songs.update((prevSongs) => [...prevSongs, song]);
        this.removeSongFromLoadingFavorites(song.id);
      })
    );
  }

  removeFromFavorites(id: string, link: string) {
    this.addSongToLoadingFavorites(id);
    const songId = this.songs().find((x) => x.link === link)!.id;
    return this.libraryBackService.removeFromFavorites(songId).pipe(
      tap(() => {
        this.songs.update((prevSongs) =>
          prevSongs.filter((song) => song.link !== link)
        );
        this.removeSongFromLoadingFavorites(id);
      })
    );
  }

  setSongDownloaded(songId: string) {
    this.songs.update((prevSongs) =>
      prevSongs.map((x) => {
        if (x.id === songId) {
          x.downloaded = true;
        }
        return x;
      })
    );
  }

  getPreviousSong(currentSongId: string): Song {
    const songIndex = this.songs().findIndex(
      (song) => song.id === currentSongId
    );

    if (songIndex === -1) {
      return this.songs()[0];
    }

    return this.songs()[
      (songIndex - 1 + this.songs().length) % this.songs().length
    ];
  }

  getNextSong(currentSongId: string): Song {
    const songIndex = this.songs().findIndex(
      (song) => song.id === currentSongId
    );

    if (songIndex === -1) {
      return this.songs()[0];
    }

    return this.songs()[(songIndex + 1) % this.songs().length];
  }

  getRandomSongFromCurrentPlaylist(): Song {
    return this.songs()[Math.floor(Math.random() * this.songs().length)];
  }

  private addSongToLoadingFavorites(id: string) {
    this.currentLoadingFavoriteSongIds.update((prevSongIds) =>
      prevSongIds.includes(id) ? prevSongIds : [...prevSongIds, id]
    );
  }

  private removeSongFromLoadingFavorites(id: string) {
    this.currentLoadingFavoriteSongIds.update((prevSongIds) =>
      prevSongIds.filter((songId) => songId !== id)
    );
  }
}
