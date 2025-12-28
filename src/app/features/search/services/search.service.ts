import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap } from 'rxjs';
import { SearchStatus, Song } from '../../../core/models/song.model';
import { environment } from '../../../../environments/environment.development';

const BASE_API_URL = environment.API_URL;

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private readonly httpClient = inject(HttpClient);

  private readonly _songs = signal<Song[]>([]);
  private readonly _searchStatus = signal<SearchStatus>(SearchStatus.None);
  private readonly _suggestions = signal<string[]>([]);

  readonly songs = this._songs.asReadonly();
  readonly status = this._searchStatus.asReadonly();
  readonly suggestions = this._suggestions.asReadonly();

  searchSongs(searchTerm: string): Observable<Song[]> {
    this._searchStatus.set(SearchStatus.Loading);
    
    return this.httpClient.get<Song[]>(`${BASE_API_URL}/search?q=${searchTerm}`).pipe(
      tap((songs: Song[]) => {
        this._songs.set(songs);
        this._searchStatus.set(SearchStatus.Finished);
      }),
      catchError(() => {
        this._searchStatus.set(SearchStatus.Error);
        return [];
      })
    );
  }

  getSuggestions(term: string): Observable<string[]> {
    return this.httpClient.get<string[]>(`${BASE_API_URL}/suggest?q=${term}`).pipe(
      tap((result) => this._suggestions.set(result))
    );
  }

  resetSuggestions(): void {
    this._suggestions.set([]);
  }

  resetSearch(): void {
    this._songs.set([]);
    this._searchStatus.set(SearchStatus.None);
    this._suggestions.set([]);
  }
}
