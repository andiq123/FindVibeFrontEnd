import { Component, computed, input, OnInit, signal, OnDestroy, effect, inject } from '@angular/core';
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
  suggestions = computed(() => this.suggestionsService.suggestions());
  
  private searchSubject = new Subject<string>();

  faMagnifyingGlass = faMagnifyingGlass;
  faArrowUpLeft = faArrowUp; 

  public suggestionsService = inject(SearchService);
  private router = inject(Router);

  constructor() {
    // React to query input changes (e.g. from navigation)
    effect(() => {
      const q = this.query();
      if (q) {
        this.searchTerm.set(q);
        this.submitSearchSongs();
        this.suggestionsService.resetSuggestions();
      } else {
        // Handle empty query (reset state)
        this.searchTerm.set('');
        this.suggestionsService.resetSearch();
      }
    });
  }

  ngOnInit(): void {
    // Best Debounce Approach: RxJS Subject with 300ms window
    this.searchSubject.pipe(
      debounceTime(300),
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
    this.router.navigate(['/songs/']); // Reset route to search base
  }

  async submit() {
    if (this.searchTerm().trim() === '') {
      return;
    }

    await this.setQueryParamsToCurrentSearchTerm();
    this.submitSearchSongs();
    this.suggestionsService.resetSuggestions();
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
