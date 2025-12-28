import { Injectable, inject } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { environment } from '../../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Song } from '../../../core/models/song.model';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import { Reorder } from '../../../core/models/reorder.model';

@Injectable({
  providedIn: 'root',
})
export class LibraryApiService {
  private baseUrl = environment.API_URL + '/favorites/';

  private storageService = inject(StorageService);

  constructor(private httpClient: HttpClient) {}

  getFavoritesSong(userId: string): Observable<Song[]> {
    const songsFromStorage = this.getLibraryFromLocalStorage();
    
    const apiCall = this.httpClient.get<Song[]>(this.baseUrl + userId).pipe(
      catchError((e) => {
        if (e.status === 404) {
          this.setLibraryToLocalStorage([]);
          return of([]);
        }
        return of(songsFromStorage);
      }),
      map(songs => songs.sort((a, b) => a.order - b.order)),
      tap(songs => this.setLibraryToLocalStorage(songs))
    );

    return songsFromStorage.length > 0 
      ? of(songsFromStorage).pipe(switchMap(() => apiCall))
      : apiCall;
  }

  reorderSongs(reorders: Reorder[]) {
    return this.httpClient.put(environment.API_URL + '/favorites', reorders);
  }

  addToFavorites(song: Song, userId: string) {
    return this.httpClient.post(this.baseUrl + userId, song);
  }

  removeFromFavorites(songId: string) {
    return this.httpClient.delete(this.baseUrl + songId);
  }

  setLibraryToLocalStorage(songs: Song[]) {
    this.storageService.setItem('library', songs);
  }

  getLibraryFromLocalStorage() {
    return this.storageService.getItem<Song[]>('library') || [];
  }
}
