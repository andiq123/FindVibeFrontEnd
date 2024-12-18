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
  private baseUrl = environment.API_URL + '/favorites/';

  constructor(private httpClient: HttpClient) {}

  getFavoritesSong(userId: string): Observable<Song[]> {
    return new Observable((observer) => {
      const songsFromStorage = this.getLibraryFromLocalStorage();

      if (songsFromStorage.length > 0) {
        observer.next(songsFromStorage);
      }

      this.httpClient
        .get<Song[]>(this.baseUrl + userId)
        .pipe(
          catchError((e) => {
            if (e.status === 404) {
              this.setLibraryToLocalStorage([]);
              observer.next([]);
            }
            observer.complete();
            return [];
          }),
          map((songs) => {
            return songs.sort((a, b) => a.order - b.order);
          }),
          tap((songs) => {
            this.setLibraryToLocalStorage(songs);
            observer.next(songs);
            observer.complete();
          })
        )
        .pipe(
          map((songs) => {
            return songs.sort((a, b) => a.order - b.order);
          })
        )
        .subscribe();
    });
  }

  reorderSongs(reorders: Reorder[]) {
    return this.httpClient.put(this.baseUrl, reorders);
  }

  addToFavorites(song: SongToAddFavorite, userId: string) {
    return this.httpClient.post(this.baseUrl + userId, song);
  }

  removeFromFavorites(songId: string) {
    return this.httpClient.delete(this.baseUrl + songId);
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
