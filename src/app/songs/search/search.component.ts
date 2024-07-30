import { Component, effect, OnInit, Signal, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { FormsModule } from '@angular/forms';
import { SongsService } from '../songs.service';
import { SuggestionsService } from '../suggestions.service';
import { TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';

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
  ) {}

  ngOnInit(): void {
    this.suggestions = this.suggestionsService.suggestions$;
    this.checkAndSetIfQueryParamsExist();
  }

  searchBySuggestion(suggestion: string) {
    this.searchTerm.set(suggestion);
    this.submit();
  }

  search(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);

    if (this.searchTerm() === '') this.suggestionsService.reset();

    if (this.timeOut) clearTimeout(this.timeOut);

    this.timeOut = setTimeout(() => {
      this.suggestionsService.getSuggestions(this.searchTerm()).subscribe();
    }, 100);
  }

  submit() {
    if (this.searchTerm() === '') return;

    this.songsService.searchSongs(this.searchTerm()).subscribe();

    this.setQueryParamsToCurrentSearchTerm();
    this.suggestionsService.reset();
  }

  private checkAndSetIfQueryParamsExist() {
    this.activatedRoute.queryParams.pipe(take(2)).subscribe((params) => {
      if (params['query']) {
        this.searchTerm.set(params['query']);
        this.submit();
        return;
      }
    });
  }

  private setQueryParamsToCurrentSearchTerm() {
    this.router.navigate([], {
      queryParams: { query: this.searchTerm() },
      queryParamsHandling: 'merge',
    });
  }
}
