import { Injectable, inject } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { environment } from '../../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Song } from '../../../core/models/song.model';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { Reorder } from '../../../core/models/reorder.model';

const LIBRARY_STORAGE_KEY = 'library';
const BASE_API_URL = environment.API_URL;

@Injectable({
  providedIn: 'root',
})
export class LibraryApiService {
  private readonly storageService = inject(StorageService);
  private readonly httpClient = inject(HttpClient);

  getFavoritesSong(userId: string): Observable<Song[]> {
    const cachedSongs = this.getLibraryFromLocalStorage();
    const apiCall = this.fetchFromApi(userId);

    return cachedSongs.length > 0
      ? of(cachedSongs).pipe(switchMap(() => apiCall))
      : apiCall;
  }

  private fetchFromApi(userId: string): Observable<Song[]> {
    return this.httpClient.get<Song[]>(`${BASE_API_URL}/favorites/${userId}`).pipe(
      catchError((error) => {
        if (error.status === 404) {
          this.setLibraryToLocalStorage([]);
          return of([]);
        }
        return of(this.getLibraryFromLocalStorage());
      }),
      map(songs => songs.sort((a, b) => a.order - b.order)),
      tap(songs => this.setLibraryToLocalStorage(songs))
    );
  }

  reorderSongs(reorders: Reorder[]): Observable<unknown> {
    return this.httpClient.put(`${BASE_API_URL}/favorites`, reorders);
  }

  addToFavorites(song: Song, userId: string): Observable<unknown> {
    return this.httpClient.post(`${BASE_API_URL}/favorites/${userId}`, song);
  }

  removeFromFavorites(songId: string): Observable<unknown> {
    return this.httpClient.delete(`${BASE_API_URL}/favorites/${songId}`);
  }

  setLibraryToLocalStorage(songs: Song[]): void {
    this.storageService.setItem(LIBRARY_STORAGE_KEY, songs);
  }

  getLibraryFromLocalStorage(): Song[] {
    return this.storageService.getItem<Song[]>(LIBRARY_STORAGE_KEY) || [];
  }

  clearLibraryFromLocalStorage(): void {
    this.storageService.removeItem(LIBRARY_STORAGE_KEY);
  }
}
