import { computed, Injectable, signal, inject, effect } from '@angular/core';
import { LibraryApiService } from './library-api.service';
import { UserService } from './user.service';
import { tap } from 'rxjs';
import { Song } from '../../../core/models/song.model';
import { OfflineStorageService } from './offline-storage.service';
import { Reorder } from '../../../core/models/reorder.model';
import { trackLoadingState } from '../../../core/utils/loading-state.util';

@Injectable({
  providedIn: 'root',
})
export class LibraryService {
  private readonly libraryApiService = inject(LibraryApiService);
  private readonly offlineStorageService = inject(OfflineStorageService);
  private readonly userService = inject(UserService);

  readonly songs = signal<Song[]>([]);
  readonly currentLoadingFavoriteSongIds = signal<string[]>([]);
  readonly loadingSongs = signal<boolean>(false);

  private readonly userEffect = effect(() => {
    const user = this.userService.user();
    if (user) {
      if (this.songs().length === 0) {
        this.updateLibrarySongs(user.id).subscribe();
      }
    } else {
      this.reset();
    }
  });

  reset(): void {
    this.songs.set([]);
    this.currentLoadingFavoriteSongIds.set([]);
    this.loadingSongs.set(false);
  }

  readonly orderHasChanged = computed(() => {
    const localSongs = this.libraryApiService.getLibraryFromLocalStorage();
    const currentSongs = this.songs();

    if (localSongs.length !== currentSongs.length) return true;

    for (let i = 0; i < currentSongs.length; i++) {
      if (currentSongs[i].id !== localSongs[i]?.id) return true;
    }

    return false;
  });

  updateLibrarySongs(userId: string) {
    this.loadingSongs.set(true);
    return this.libraryApiService.getFavoritesSong(userId).pipe(
      tap({
        next: (songs: Song[]) => {
          this.songs.set(songs);
          this.loadingSongs.set(false);
        },
        error: (error) => {
          this.loadingSongs.set(false);
          if (error.status === 404) {
            this.userService.resetUser();
          }
        },
      })
    );
  }

  addToFavorites(song: Song, userId: string) {
    this.trackLoadingFavorite(song.id, true);

    const order = this.songs().length === 0 ? 1 : this.songs().length + 1;
    const favoriteSong: Song = { ...song, order };

    return this.libraryApiService.addToFavorites(favoriteSong, userId).pipe(
      tap({
        next: () => {
          this.songs.update((prevSongs: Song[]) => [...prevSongs, favoriteSong]);
          this.libraryApiService.setLibraryToLocalStorage(this.songs());
          this.trackLoadingFavorite(song.id, false);
        },
        error: () => this.trackLoadingFavorite(song.id, false),
      })
    );
  }

  removeFromFavorites(id: string, link: string) {
    this.trackLoadingFavorite(id, true);
    const songId = this.songs().find((x: Song) => x.link === link)!.id;

    return this.libraryApiService.removeFromFavorites(songId).pipe(
      tap({
        next: async () => {
          await this.offlineStorageService.removeSongFromCache(id, link);
          this.songs.update((prevSongs: Song[]) =>
            prevSongs.filter((song: Song) => song.link !== link)
          );
          this.libraryApiService.setLibraryToLocalStorage(this.songs());
          this.trackLoadingFavorite(id, false);
        },
        error: () => this.trackLoadingFavorite(id, false),
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
        this.libraryApiService.setLibraryToLocalStorage(this.songs());
        this.resetReorder();
      })
    );
  }

  changePlaces(id1: string, id2: string): void {
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

  resetReorder(): void {
    const songs = this.libraryApiService
      .getLibraryFromLocalStorage()
      .sort((a: Song, b: Song) => a.order - b.order);
    this.songs.set(songs);
  }

  private trackLoadingFavorite(id: string, isLoading: boolean): void {
    trackLoadingState(this.currentLoadingFavoriteSongIds, id, isLoading);
  }
}
