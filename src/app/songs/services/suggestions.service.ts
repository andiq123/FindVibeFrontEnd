import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class SuggestionsService {
  baseUrl = environment.API_URL + '/suggestions?q=';

  private suggestions = signal<string[]>([]);
  suggestions$ = this.suggestions.asReadonly();

  constructor(private httpClient: HttpClient) {}

  getSuggestions(term: string): Observable<string[]> {
    return this.httpClient.get<string[]>(this.baseUrl + term).pipe(
      timeout(1000),
      tap((result) => {
        this.suggestions.set(result);
      })
    );
  }

  reset() {
    this.suggestions.set([]);

    setTimeout(() => {
      if (this.suggestions().length > 0) this.suggestions.set([]);
    }, 300);
  }
}
