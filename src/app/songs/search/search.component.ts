import {Component, OnInit, signal, Signal} from '@angular/core';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {faMagnifyingGlass} from '@fortawesome/free-solid-svg-icons';
import {FormsModule} from '@angular/forms';
import {SongsService} from '../songs.service';
import {SuggestionsService} from '../suggestions.service';
import {TitleCasePipe} from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FontAwesomeModule, FormsModule, TitleCasePipe],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchComponent implements OnInit {
  searchTerm = signal<string>('');
  suggestions!: Signal<string[]>;

  faMagnifyingGlass = faMagnifyingGlass;
  timeOut: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private songsService: SongsService,
    private suggestionsService: SuggestionsService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {
  }

  ngOnInit(): void {
    this.suggestions = this.suggestionsService.suggestions$;
    this.searchIfQueryPresent();
  }

  async searchBySuggestion(suggestion: string) {
    this.searchTerm.set(suggestion);
    await this.submit();
  }

  search(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);

    if (this.searchTerm() === '') {
      clearTimeout(this.timeOut);
      setTimeout(() => {
        this.suggestionsService.reset();
      }, 200);
    } else {
      this.searchSuggestionByTimeOut();
    }
  }

  async submit() {
    if (this.searchTerm() === '') return;

    this.songsService.searchSongs(this.searchTerm()).subscribe();

    await this.setQueryParamsToCurrentSearchTerm();
    setTimeout(() => {
      this.suggestionsService.reset();
    }, 200);
  }

  private async setQueryParamsToCurrentSearchTerm() {
    await this.router.navigate([], {
      queryParams: {query: this.searchTerm()},
      queryParamsHandling: 'merge',
    });
  }

  private searchSuggestionByTimeOut() {
    if (this.timeOut) {
      clearTimeout(this.timeOut);
    }

    this.timeOut = setTimeout(() => {
      this.suggestionsService.getSuggestions(this.searchTerm()).subscribe();
    }, 100);
  }

  private searchIfQueryPresent() {
    const query = this.activatedRoute.snapshot.queryParams["query"];
    if (query) {
      this.searchTerm.set(query);
      this.songsService.searchSongs(this.searchTerm()).subscribe();
    }
  }
}
