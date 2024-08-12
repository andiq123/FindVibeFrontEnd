import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap } from 'rxjs';
import { SearchStatus, Song } from '../models/song.model';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class SongsService {
  private songs = signal<Song[]>([]);
  private searchStatus = signal<SearchStatus>(SearchStatus.None);
  private baseApi = environment.API_URL + '/api/songs/search?searchQuery=';
  songs$ = this.songs.asReadonly();
  status$ = this.searchStatus.asReadonly();

  constructor(private httpService: HttpClient) {}

  searchSongs(searchTerm: string): Observable<{ songs: Song[] }> {
    this.setStatusLoading();
    return this.httpService
      .get<{ songs: Song[] }>(this.baseApi + searchTerm)
      .pipe(
        tap((list) => {
          this.songs.set(list.songs);
          this.setStatusFinished();
        }),
        catchError(() => {
          this.setStatusError();
          return [];
        })
      );
  }

  private setStatusFinished() {
    this.searchStatus.set(SearchStatus.Finished);
  }

  private setStatusLoading() {
    this.searchStatus.set(SearchStatus.Loading);
  }

  private setStatusError() {
    this.searchStatus.set(SearchStatus.Error);
  }
}
