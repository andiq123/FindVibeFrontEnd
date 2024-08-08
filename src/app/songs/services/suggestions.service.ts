import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class SuggestionsService {
  baseUrl = environment.API_URL + '/api/suggestions?searchQuery=';

  private suggestions = signal<string[]>([]);
  suggestions$ = this.suggestions.asReadonly();

  constructor(private httpClient: HttpClient) {}

  getSuggestions(term: string): Observable<{ results: string[] }> {
    return this.httpClient.get<{ results: string[] }>(this.baseUrl + term).pipe(
      timeout(1000),
      tap((suggestions) => {
        this.suggestions.set(suggestions.results);
      })
    );
  }

  reset() {
    this.suggestions.set([]);
  }
}
