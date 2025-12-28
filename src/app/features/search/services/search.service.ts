import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap } from 'rxjs';
import { SearchStatus, Song } from '../../../core/models/song.model';
import { environment } from '../../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private httpService = inject(HttpClient);
  
  private _songs = signal<Song[]>([]);
  private _searchStatus = signal<SearchStatus>(SearchStatus.None);
  private baseApi = environment.API_URL + '/search?q=';
  private suggestApi = environment.API_URL + '/suggest?q=';
  
  private _suggestions = signal<string[]>([]);
  
  songs = this._songs.asReadonly();
  status = this._searchStatus.asReadonly();
  suggestions = this._suggestions.asReadonly();

  searchSongs(searchTerm: string): Observable<Song[]> {
    this.setStatusLoading();
    return this.httpService.get<Song[]>(this.baseApi + searchTerm).pipe(
      tap((songs: Song[]) => {
        this._songs.set(songs);
        this.setStatusFinished();
      }),
      catchError(() => {
        this.setStatusError();
        return [];
      })
    );
  }

  getSuggestions(term: string): Observable<string[]> {
    return this.httpService.get<string[]>(this.suggestApi + term).pipe(
      tap((result) => {
        this._suggestions.set(result);
      })
    );
  }

  resetSuggestions() {
    this._suggestions.set([]);
  }

  private setStatusFinished() {
    this._searchStatus.set(SearchStatus.Finished);
  }

  private setStatusLoading() {
    this._searchStatus.set(SearchStatus.Loading);
  }

  private setStatusError() {
    this._searchStatus.set(SearchStatus.Error);
  }
}
