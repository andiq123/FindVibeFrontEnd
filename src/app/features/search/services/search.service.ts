import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap, of } from 'rxjs';
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
  private readonly _lastSearchQuery = signal<string>('');

  readonly songs = this._songs.asReadonly();
  readonly status = this._searchStatus.asReadonly();
  readonly suggestions = this._suggestions.asReadonly();
  readonly lastQuery = this._lastSearchQuery.asReadonly();

  private loadingTimeout?: ReturnType<typeof setTimeout>;

  searchSongs(searchTerm: string, force = false): Observable<Song[]> {
    if (!force && searchTerm === this._lastSearchQuery() && this._songs().length > 0) {
        return of(this._songs());
    }

    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }

    this._songs.set([]);

    this.loadingTimeout = setTimeout(() => {
      this._searchStatus.set(SearchStatus.Loading);
    }, 250);

    return this.httpClient.get<Song[]>(`${BASE_API_URL}/search?q=${searchTerm}`).pipe(
      tap((songs: Song[]) => {
        if (this.loadingTimeout) {
          clearTimeout(this.loadingTimeout);
          this.loadingTimeout = undefined;
        }
        this._songs.set(songs);
        this._searchStatus.set(SearchStatus.Finished);
        this._lastSearchQuery.set(searchTerm);
      }),
      catchError(() => {
        if (this.loadingTimeout) {
          clearTimeout(this.loadingTimeout);
          this.loadingTimeout = undefined;
        }
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
    this._lastSearchQuery.set('');
  }
}
