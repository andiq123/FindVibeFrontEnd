import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { SongToAddFavorite } from '../models/songToAddFavorite.model';
import { Song } from '../../songs/models/song.model';
import { catchError, map, Observable, tap } from 'rxjs';
import { Reorder } from '../models/reorder.model';

@Injectable({
  providedIn: 'root',
})
export class LibraryBackService {
  private baseUrl = environment.API_URL + '/api';

  constructor(private httpClient: HttpClient) {}

  getFavoritesSong(userId: string): Observable<{ songs: Song[] }> {
    return new Observable((observer) => {
      const songsFromStorage = this.getLibraryFromLocalStorage();

      if (songsFromStorage.length > 0) {
        observer.next({ songs: songsFromStorage });
      }

      this.httpClient
        .get<{ songs: Song[] }>(
          this.baseUrl + '/songs/get-favorites?userId=' + userId
        )
        .pipe(
          catchError((e) => {
            if (e.status === 404) {
              this.setLibraryToLocalStorage([]);
              observer.next({ songs: [] });
            }
            observer.complete();
            return [];
          }),
          map((data) => {
            return { songs: data.songs.sort((a, b) => a.order - b.order) };
          }),
          tap((data) => {
            this.setLibraryToLocalStorage(data.songs);
            observer.next(data);
            observer.complete();
          })
        )
        .pipe(
          map((data) => {
            return { songs: data.songs.sort((a, b) => a.order - b.order) };
          })
        )
        .subscribe();
    });
  }

  reorderSongs(reorders: Reorder[]) {
    const reorderRequest = {
      reorders,
    };

    return this.httpClient.post(
      this.baseUrl + '/songs/reorder',
      reorderRequest
    );
  }

  addToFavorites(song: SongToAddFavorite) {
    return this.httpClient.post(this.baseUrl + '/songs/add-favorite', song);
  }

  removeFromFavorites(songId: string) {
    return this.httpClient.delete(
      this.baseUrl + '/songs/remove-favorite?songId=' + songId
    );
  }

  setLibraryToLocalStorage(songs: Song[]) {
    localStorage.setItem('library', JSON.stringify(songs));
  }

  getLibraryFromLocalStorage() {
    const library = localStorage.getItem('library');
    if (!library) return [];
    return JSON.parse(library) as Song[];
  }
}
