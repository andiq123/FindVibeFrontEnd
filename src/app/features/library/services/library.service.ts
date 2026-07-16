import { Injectable, signal, inject, effect, untracked } from "@angular/core";
import { LibraryApiService } from "./library-api.service";
import { UserService } from "./user.service";
import {
  finalize,
  tap,
  catchError,
  throwError,
  Subscription,
  EMPTY,
  switchMap,
  from,
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
  readonly loadingSongs = signal(false);
  private libraryUpdateSubscription: Subscription | null = null;

  constructor() {
    effect(() => {
      // Always persist — empty list must clear ghost favorites.
      this.storageService.setItem(this.LIBRARY_STORAGE_KEY, this.songs());
    });
    effect((onCleanup) => {
      const user = untracked(() => this.userService.user());
      if (this.libraryUpdateSubscription) {
        this.libraryUpdateSubscription.unsubscribe();
        this.libraryUpdateSubscription = null;
      }
      if (user) {
        untracked(() => {
          this.libraryUpdateSubscription = this.updateLibrarySongs(
            user.id,
          ).subscribe();
        });
      } else {
        untracked(() => this.reset());
      }
      onCleanup(() => {
        this.libraryUpdateSubscription?.unsubscribe();
        this.libraryUpdateSubscription = null;
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
    // Timeout + cold-start retry handled by apiInterceptor.
    return this.libraryApiService.getFavoritesSong(userId).pipe(
      tap({
        next: (songs: Song[]) => {
          if (!Array.isArray(songs)) {
            console.error("[LibraryService] Invalid favorites payload:", songs);
            this.userService.resetUser();
            return;
          }
          const sortedSongs = [...songs].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0),
          );
          // Keep local cover/lyrics if API row is still empty (PATCH lag / offline).
          const merged = sortedSongs.map((s) => {
            const prev = currentSongs.find((l) => l.link === s.link);
            let out = s;
            if (!s.image?.trim() && prev?.image?.trim()) {
              this.libraryApiService
                .updateFavoriteImage(s.id, prev.image)
                .subscribe({ error: () => {} });
              out = { ...out, image: prev.image };
            }
            if (!s.lyrics?.trim() && prev?.lyrics?.trim()) {
              this.libraryApiService
                .updateFavoriteLyrics(s.id, prev.lyrics)
                .subscribe({ error: () => {} });
              out = { ...out, lyrics: prev.lyrics };
            }
            return out;
          });
          this.songs.set(merged);
          void this.offlineStorageService.syncOfflineSongs(merged);
        },
        error: (error) => {
          if (error.status === 401 || error.status === 403) {
            this.userService.resetUser();
            return;
          }
          if (error.status === 404 || error.name === "TimeoutError") {
            console.warn(
              "[LibraryService] API unavailable — keeping local vault",
            );
          }
        },
      }),
      catchError((err) => throwError(() => err)),
      finalize(() => this.loadingSongs.set(false)),
    );
  }

  /**
   * Add to vault. Default: top of the list (newest first).
   * Pass `order` to place explicitly (Spotify import keeps playlist order).
   */
  addToFavorites(song: Song, userId: string, opts?: { order?: number }) {
    this.trackLoadingFavorite(song.id, true);
    const order = opts?.order ?? this.nextTopOrder();
    const favoriteSong: Song = { ...song, order };
    return this.libraryApiService.addToFavorites(favoriteSong, userId).pipe(
      tap({
        next: () => {
          this.songs.update((prev) => insertByOrder(prev, favoriteSong));
          void this.offlineStorageService.cacheSong(favoriteSong);
        },
      }),
      finalize(() => this.trackLoadingFavorite(song.id, false)),
    );
  }

  /** Contiguous order values sitting above the current vault (playlist block). */
  reserveTopOrders(count: number): number[] {
    if (count < 1) return [];
    const base = this.nextTopOrder() - (count - 1);
    return Array.from({ length: count }, (_, i) => base + i);
  }

  private nextTopOrder(): number {
    const prev = this.songs();
    if (!prev.length) return 1;
    let min = prev[0].order ?? 0;
    for (const s of prev) min = Math.min(min, s.order ?? 0);
    return min - 1;
  }

  removeFromFavorites(id: string, link: string) {
    this.trackLoadingFavorite(id, true);
    const song = this.songs().find((x) => x.link === link);
    if (!song) {
      this.trackLoadingFavorite(id, false);
      return EMPTY;
    }
    return this.libraryApiService.removeFromFavorites(song.id).pipe(
      switchMap(() =>
        from(
          this.offlineStorageService.removeSongFromCache(song.id, song.link),
        ),
      ),
      tap(() => {
        this.songs.update((prev) => prev.filter((s) => s.link !== link));
      }),
      finalize(() => this.trackLoadingFavorite(id, false)),
    );
  }

  saveReorders() {
    const reorders: Reorder[] = this.songs().map((x, i) => ({
      songId: x.id,
      order: x.order ?? i + 1,
    }));
    return this.libraryApiService.reorderSongs(reorders);
  }

  /** Persist cover URL on a vault track (localStorage + DB). No-op if not favorited. */
  persistSongImage(link: string, image: string): void {
    const vault = this.songs().find((s) => s.link === link);
    if (!vault || !image || vault.image === image) return;
    this.songs.update((prev) =>
      prev.map((s) => (s.link === link ? { ...s, image } : s)),
    );
    this.libraryApiService.updateFavoriteImage(vault.id, image).subscribe({
      error: () => {},
    });
  }

  /** Persist lyrics on a vault track after first explicit open. No-op if not favorited. */
  persistSongLyrics(link: string, lyrics: string): void {
    const text = lyrics.trim();
    const vault = this.songs().find((s) => s.link === link);
    if (!vault || !text || vault.lyrics === text) return;
    this.songs.update((prev) =>
      prev.map((s) => (s.link === link ? { ...s, lyrics: text } : s)),
    );
    this.libraryApiService.updateFavoriteLyrics(vault.id, text).subscribe({
      error: () => {},
    });
  }

  changePlaces(id1: string, id2: string): void {
    this.songs.update((prevSongs) => {
      const index1 = prevSongs.findIndex((x) => x.id === id1);
      const index2 = prevSongs.findIndex((x) => x.id === id2);
      if (index1 === -1 || index2 === -1) return prevSongs;
      const newSongs = [...prevSongs];
      [newSongs[index1], newSongs[index2]] = [newSongs[index2], newSongs[index1]];
      return newSongs.map((song, i) => ({ ...song, order: i + 1 }));
    });
  }

  /** Instant local restore after Discard (no network). */
  replaceSongs(songs: Song[]): void {
    this.songs.set(songs);
  }

  private trackLoadingFavorite(id: string, isLoading: boolean): void {
    trackLoadingState(this.currentLoadingFavoriteSongIds, id, isLoading);
  }
}

/** Keep vault array in ascending `order` (top of list = smallest order). */
function insertByOrder(prev: Song[], song: Song): Song[] {
  const without = prev.filter((s) => s.link !== song.link);
  const order = song.order ?? 0;
  const i = without.findIndex((s) => (s.order ?? 0) > order);
  if (i === -1) return [...without, song];
  return [...without.slice(0, i), song, ...without.slice(i)];
}
