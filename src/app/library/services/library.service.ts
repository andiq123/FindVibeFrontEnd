import { effect, Injectable, signal } from '@angular/core';

import { LibraryBackService } from './library-back.service';

import { catchError, tap } from 'rxjs';
import { Song } from '../../songs/models/song.model';
import { SongToAddFavorite } from '../models/songToAddFavorite.model';

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

  constructor(private libraryBackService: LibraryBackService) {
    effect(async () => {
      if (this.songs().length > 0) {
        await this.cacheAllSongs();
        console.log('finished');
      }
    });
  }

  async cacheAllSongs() {
    const cachedLibrary = await caches.open('library');
    const corsProxy = 'https://cors-anywhere.herokuapp.com/';
    const link = this.songs()[0].link;

    const proxiedUrl = `${corsProxy}${link}`;

    const response = await fetch(proxiedUrl, {
      method: 'GET',
      headers: {
        Origin: window.location.origin,
      },
    });
    await cachedLibrary.add(response.url);
  }

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

    this.libraryBackService.addToFavorites(favoriteSong).subscribe(() => {
      this.songs.update((prevSongs) => [...prevSongs, song]);
      this.removeSongFromLoadingFavorites(song.id);
    });
  }

  removeFromFavorites(id: string, link: string) {
    this.addSongToLoadingFavorites(id);
    const songId = this.songs().find((x) => x.link === link)!.id;
    this.libraryBackService
      .removeFromFavorites(songId)
      .pipe()
      .subscribe(() => {
        this.songs.update((prevSongs) =>
          prevSongs.filter((song) => song.link !== link)
        );
        this.removeSongFromLoadingFavorites(id);
      });
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
