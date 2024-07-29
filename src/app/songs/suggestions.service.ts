import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SuggestionsService {
  baseUrl = environment.API_URL + '/suggestions?query=';
  private suggestions = signal<string[]>([]);
  suggestions$ = this.suggestions.asReadonly();

  constructor(private httpClient: HttpClient) {}

  getSuggestions(term: string): Observable<string[]> {
    return this.httpClient.get<string[]>(this.baseUrl + term).pipe(
      tap((suggestions) => {
        this.suggestions.set(suggestions);
      })
    );
  }

  reset() {
    this.suggestions.set([]);
  }
}
