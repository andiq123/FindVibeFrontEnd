import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Injectable, signal} from '@angular/core';
import {environment} from '../../environments/environment.development';
import {Observable, tap} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SuggestionsService {
  baseUrl = environment.API_URL + '/api/suggestions?searchQuery=';

  private suggestions = signal<string[]>([]);
  suggestions$ = this.suggestions.asReadonly();

  constructor(private httpClient: HttpClient) {
  }

  getSuggestions(term: string): Observable<{ results: string[] }> {
    return this.httpClient.get<{ results: string[] }>(this.baseUrl + term).pipe(
      tap((suggestions) => {
        this.suggestions.set(suggestions.results);
      })
    );
  }

  reset() {
    this.suggestions.set([]);
  }
}
