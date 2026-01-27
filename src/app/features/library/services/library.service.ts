import { Injectable, signal, inject, effect, untracked } from "@angular/core";
import { LibraryApiService } from "./library-api.service";
import { UserService } from "./user.service";
import {
  finalize,
  Observable,
  tap,
  timeout,
  catchError,
  throwError,
  Subscription,
} from "rxjs";
import { Song } from "../../../core/models/song.model";
import { OfflineStorageService } from "./offline-storage.service";
import { Reorder } from "../../../core/models/reorder.model";
import { trackLoadingState } from "../../../core/utils/loading-state.util";
import { StorageService } from "../../../core/services/storage.service";

@Injectable({
  providedIn: "root",
})
export class LibraryService {
  private readonly libraryApiService = inject(LibraryApiService);
  private readonly offlineStorageService = inject(OfflineStorageService);
  private readonly userService = inject(UserService);
  private readonly storageService = inject(StorageService);

  private readonly LIBRARY_STORAGE_KEY = "library";

  readonly songs = signal<Song[]>(
    this.storageService.getItem<Song[]>(this.LIBRARY_STORAGE_KEY) || [],
  );
  readonly currentLoadingFavoriteSongIds = signal<string[]>([]);
  readonly loadingSongs = signal<boolean>(false);

  private libraryUpdateSubscription: Subscription | null = null;

  constructor() {
    effect(() => {
      this.storageService.setItem(this.LIBRARY_STORAGE_KEY, this.songs());
    });

    effect((onCleanup) => {
      const user = untracked(() => this.userService.user());
      
      // Cleanup previous subscription if it exists
      if (this.libraryUpdateSubscription) {
        this.libraryUpdateSubscription.unsubscribe();
        this.libraryUpdateSubscription = null;
      }

      if (user) {
        // Use untracked to prevent effect from tracking the subscription
        untracked(() => {
          this.libraryUpdateSubscription = this.updateLibrarySongs(user.id).subscribe();
        });
      } else {
        untracked(() => {
          this.reset();
        });
      }

      // Cleanup subscription when effect is destroyed or user changes
      onCleanup(() => {
        if (this.libraryUpdateSubscription) {
          this.libraryUpdateSubscription.unsubscribe();
          this.libraryUpdateSubscription = null;
        }
      });
    });
  }

  reset(): void {
    this.songs.set([]);
    this.currentLoadingFavoriteSongIds.set([]);
    this.loadingSongs.set(false);
    this.storageService.removeItem(this.LIBRARY_STORAGE_KEY);
  }

  updateLibrarySongs(userId: string) {
    const currentSongs = untracked(() => this.songs());
    if (currentSongs.length === 0) {
      this.loadingSongs.set(true);
    }

    return this.libraryApiService.getFavoritesSong(userId).pipe(
      timeout(10000),
      tap({
        next: (songs: Song[]) => {
          if (!Array.isArray(songs)) {
            console.error(
              "[LibraryService] Received invalid songs data (expected array):",
              songs,
            );
            this.userService.resetUser();
            return;
          }
          const sortedSongs = [...songs].sort((a, b) => a.order - b.order);
          this.songs.set(sortedSongs);
        },
        error: (error) => {
          const isAuthenticationError =
            error.status === 401 || error.status === 403;

          if (isAuthenticationError) {
            console.error(
              "[LibraryService] Authentication error, logging out user",
            );
            this.userService.resetUser();
            return;
          }

          const isTemporaryError =
            error.status === 404 || error.name === "TimeoutError";

          if (isTemporaryError) {
            console.warn(
              "[LibraryService] API unavailable or timeout, keeping user logged in",
            );
          }
        },
      }),
      catchError((err) => {
        this.loadingSongs.set(false);
        return throwError(() => err);
      }),
      finalize(() => {
        this.loadingSongs.set(false);
      }),
    );
  }

  addToFavorites(song: Song, userId: string) {
    this.trackLoadingFavorite(song.id, true);

    const order = this.songs().length === 0 ? 1 : this.songs().length + 1;
    const favoriteSong: Song = { ...song, order };

    return this.libraryApiService.addToFavorites(favoriteSong, userId).pipe(
      tap({
        next: () => {
          this.songs.update((prev) => [...prev, favoriteSong]);
          this.trackLoadingFavorite(song.id, false);
        },
        error: () => this.trackLoadingFavorite(song.id, false),
      }),
    );
  }

  removeFromFavorites(id: string, link: string) {
    this.trackLoadingFavorite(id, true);
    const song = this.songs().find((x) => x.link === link);
    if (!song) {
      this.trackLoadingFavorite(id, false);
      return new Observable();
    }

    return this.libraryApiService.removeFromFavorites(song.id).pipe(
      tap({
        next: async () => {
          await this.offlineStorageService.removeSongFromCache(id, link);
          this.songs.update((prev) => prev.filter((s) => s.link !== link));
          this.trackLoadingFavorite(id, false);
        },
        error: () => this.trackLoadingFavorite(id, false),
      }),
    );
  }

  saveReorders() {
    const reorders: Reorder[] = this.songs().map((x) => ({
      songId: x.id,
      order: x.order,
    }));

    return this.libraryApiService.reorderSongs(reorders);
  }

  changePlaces(id1: string, id2: string): void {
    this.songs.update((prevSongs) => {
      const index1 = prevSongs.findIndex((x) => x.id === id1);
      const index2 = prevSongs.findIndex((x) => x.id === id2);

      if (index1 === -1 || index2 === -1) return prevSongs;

      const newSongs = [...prevSongs];
      const song1 = newSongs[index1];
      const song2 = newSongs[index2];

      newSongs[index1] = song2;
      newSongs[index2] = song1;

      return newSongs.map((song, i) => ({ ...song, order: i + 1 }));
    });
  }

  private trackLoadingFavorite(id: string, isLoading: boolean): void {
    trackLoadingState(this.currentLoadingFavoriteSongIds, id, isLoading);
  }
}
