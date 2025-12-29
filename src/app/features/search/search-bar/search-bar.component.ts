import { Component, computed, input, OnInit, signal, OnDestroy, effect, inject, untracked } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { SearchService } from '../services/search.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
    selector: 'app-search-bar',
    imports: [FontAwesomeModule, FormsModule, TitleCasePipe],
    templateUrl: './search-bar.component.html',
    styleUrl: './search-bar.component.scss'
})
export class SearchBarComponent implements OnInit, OnDestroy {
  query = input<string>('');
  searchTerm = signal<string>('');
  isFocused = signal<boolean>(false);

  private searchSubject = new Subject<string>();
  private suggestionsService = inject(SearchService);
  private router = inject(Router);

  suggestions = computed(() => this.suggestionsService.suggestions());

  faMagnifyingGlass = faMagnifyingGlass;
  faArrowUpLeft = faArrowUp;

  constructor() {
    effect(() => {
      const q = this.query();
      untracked(() => {
        if (q) {
          if (q !== this.suggestionsService.lastQuery()) {
            this.searchTerm.set(q);
            this.submitSearchSongs();
          } else {
            this.searchTerm.set(q);
          }
          this.suggestionsService.resetSuggestions();
        } else {
          const lastQ = this.suggestionsService.lastQuery();
          if (lastQ) {
            this.searchTerm.set(lastQ);
            this.router.navigate([`/songs/${lastQ}`]);
          } else {
            this.searchTerm.set('');
          }
        }
      });
    });
  }

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(150),
      distinctUntilChanged()
    ).subscribe(term => {
      if (term.trim()) {
        this.searchSuggestion(term);
      } else {
        this.suggestionsService.resetSuggestions();
      }
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  fillSuggestion(suggestion: string, event: Event) {
    event.stopPropagation();
    this.searchTerm.set(suggestion);
    this.searchSuggestion(suggestion);
  }

  async searchBySuggestion(suggestion: string) {
    this.searchTerm.set(suggestion);
    await this.submit();
  }

  onInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.searchSubject.next(value);
  }

  cancelSearch() {
    this.searchTerm.set('');
    this.suggestionsService.resetSearch();
    this.router.navigate(['/songs/']);
  }

  async submit() {
    const term = this.searchTerm().trim();
    if (term === '') {
      return;
    }

    if (this.query() === term) {
      this.submitSearchSongs();
      this.suggestionsService.resetSuggestions();
    } else {
      await this.setQueryParamsToCurrentSearchTerm();
    }
  }

  private async setQueryParamsToCurrentSearchTerm() {
    await this.router.navigate([`/songs/${this.searchTerm()}`]);
  }

  private searchSuggestion(term: string) {
    this.suggestionsService.getSuggestions(term).subscribe({
      error: () => this.suggestionsService.resetSuggestions(),
    });
  }

  private submitSearchSongs() {
    this.suggestionsService.searchSongs(this.searchTerm()).subscribe({
      error: () => this.suggestionsService.resetSuggestions(),
    });
  }
}
