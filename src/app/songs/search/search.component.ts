import { Component, computed, input, OnInit, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { SuggestionsService } from '../services/suggestions.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FontAwesomeModule, FormsModule, TitleCasePipe],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchComponent implements OnInit {
  query = input<string>('');
  searchTerm = signal<string>('');
  suggestions = computed(() => this.suggestionsService.suggestions$());

  faMagnifyingGlass = faMagnifyingGlass;
  timeOut: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private suggestionsService: SuggestionsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.searchIfQueryPresent();
  }

  async searchBySuggestion(suggestion: string) {
    this.searchTerm.set(suggestion);
    await this.submit();
  }

  search(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);

    if (this.searchTerm() === '') this.suggestionsService.reset();
    else this.submitSearch();
  }

  async submit() {
    if (this.searchTerm() === '') return;

    this.submitSearch();

    await this.setQueryParamsToCurrentSearchTerm();
    setTimeout(() => {
      this.suggestionsService.reset();
    }, 300);
  }

  private async setQueryParamsToCurrentSearchTerm() {
    await this.router.navigate([`/songs/${this.searchTerm()}`]);
  }

  private searchIfQueryPresent() {
    if (this.query() === '' || this.query() === undefined) return;

    this.searchTerm.set(this.query() || '');
    this.submitSearch();
  }

  private submitSearch() {
    this.suggestionsService.getSuggestions(this.searchTerm()).subscribe({
      next: () => this.suggestionsService.reset(),
      error: () => this.suggestionsService.reset(),
    });
  }
}
