import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SuggestionsService {
  constructor(private httpClient: HttpClient) {}

  link =
    'https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&?q=';

  getSuggestions(term: string) {
    return this.httpClient.get(this.link + term).subscribe((data) => {
      console.log(data);
    });
  }
}
