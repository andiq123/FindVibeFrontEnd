import { Injectable, signal, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { catchError, Observable, tap, of } from "rxjs";
import {
  SearchStatus,
  Song,
  SearchResponse,
  PaginationInfo,
} from "../../../core/models/song.model";
import { environment } from "../../../../environments/environment";
import { StorageService } from "../../../core/services/storage.service";
const BASE_API_URL = environment.API_URL;
const SEARCH_STORAGE_KEY = "search_state";
interface SearchState {
  songs: Song[];
  status: SearchStatus;
  query: string;
  pagination: PaginationInfo | null;
  currentPage: number;
}
@Injectable({
  providedIn: "root",
})
export class SearchService {
  private readonly httpClient = inject(HttpClient);
  private readonly storageService = inject(StorageService);
  private readonly _songs = signal<Song[]>([]);
  private readonly _searchStatus = signal<SearchStatus>(SearchStatus.None);
  private readonly _suggestions = signal<string[]>([]);
  private readonly _suggestionsLoading = signal<boolean>(false);
  private readonly _lastSearchQuery = signal<string>("");
  private readonly _pagination = signal<PaginationInfo | null>(null);
  private readonly _currentPage = signal<number>(1);
  constructor() {
    this.restoreState();
  }
  readonly songs = this._songs.asReadonly();
  readonly status = this._searchStatus.asReadonly();
  readonly suggestions = this._suggestions.asReadonly();
  readonly suggestionsLoading = this._suggestionsLoading.asReadonly();
  readonly lastQuery = this._lastSearchQuery.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly currentPage = this._currentPage.asReadonly();
  searchSongs(
    searchTerm: string,
    page = 1,
    force = false,
  ): Observable<SearchResponse> {
    if (
      !force &&
      searchTerm === this._lastSearchQuery() &&
      page === this._currentPage() &&
      this._searchStatus() === SearchStatus.Finished &&
      this._songs().length > 0
    ) {
      return of({
        songs: this._songs(),
        pagination: this._pagination(),
      });
    }
    this._searchStatus.set(SearchStatus.Loading);
    this._songs.set([]);
    const url =
      page > 1
        ? `${BASE_API_URL}/search?q=${searchTerm}&page=${page}`
        : `${BASE_API_URL}/search?q=${searchTerm}`;
    return this.httpClient.get<SearchResponse>(url).pipe(
      tap((response: SearchResponse) => {
        this._songs.set(response.songs);
        this._pagination.set(response.pagination);
        this._currentPage.set(page);
        this._searchStatus.set(SearchStatus.Finished);
        this._lastSearchQuery.set(searchTerm);
        this.saveState();
      }),
      catchError(() => {
        this._searchStatus.set(SearchStatus.Error);
        return of({ songs: [], pagination: null });
      }),
    );
  }
  getSuggestions(term: string): Observable<string[]> {
    this._suggestionsLoading.set(true);
    return this.httpClient
      .get<string[]>(`${BASE_API_URL}/suggest?q=${term}`)
      .pipe(
        tap({
          next: (result) => {
            this._suggestions.set(result);
            this._suggestionsLoading.set(false);
          },
          error: () => {
            this._suggestionsLoading.set(false);
            this._suggestions.set([]);
          },
        }),
      );
  }
  resetSuggestions(): void {
    this._suggestions.set([]);
  }
  resetSearch(): void {
    this._songs.set([]);
    this._searchStatus.set(SearchStatus.None);
    this._suggestions.set([]);
    this._lastSearchQuery.set("");
    this._pagination.set(null);
    this._currentPage.set(1);
    this.storageService.removeItem(SEARCH_STORAGE_KEY);
  }
  private saveState(): void {
    const state: SearchState = {
      songs: this._songs(),
      status: this._searchStatus(),
      query: this._lastSearchQuery(),
      pagination: this._pagination(),
      currentPage: this._currentPage(),
    };
    this.storageService.setItem(SEARCH_STORAGE_KEY, state);
  }
  private restoreState(): void {
    const state = this.storageService.getItem<SearchState>(SEARCH_STORAGE_KEY);
    if (state) {
      this._songs.set(state.songs);
      this._searchStatus.set(state.status);
      this._lastSearchQuery.set(state.query);
      this._pagination.set(state.pagination || null);
      this._currentPage.set(state.currentPage || 1);
    }
  }
}
