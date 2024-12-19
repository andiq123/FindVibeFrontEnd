import { Component, computed, input, OnInit, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { SongsService } from '../services/songs.service';
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

  constructor(
    private songsService: SongsService,
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

    if (this.searchTerm() === '') {
      this.suggestionsService.reset();

      setTimeout(() => {
        if (this.suggestions().length > 0) this.suggestionsService.reset();
      }, 500);

      return;
    }
    this.searchSuggestion();
  }

  async submit() {
    if (this.searchTerm() === '') {
      setTimeout(() => {
        if (this.suggestions().length > 0) this.suggestionsService.reset();
      }, 300);
      return;
    }

    await this.setQueryParamsToCurrentSearchTerm();

    this.songsService.searchSongs(this.searchTerm()).subscribe({
      next: () => this.suggestionsService.reset(),
      error: () => this.suggestionsService.reset(),
    });
  }

  private async setQueryParamsToCurrentSearchTerm() {
    await this.router.navigate([`/songs/${this.searchTerm()}`]);
  }

  private searchSuggestion() {
    this.suggestionsService.getSuggestions(this.searchTerm()).subscribe({
      error: () => this.suggestionsService.reset(),
    });
  }

  private searchIfQueryPresent() {
    if (this.query() === '' || this.query() === undefined) return;

    this.searchTerm.set(this.query() || '');
    this.songsService.searchSongs(this.searchTerm()).subscribe({
      next: () => this.suggestionsService.reset(),
      error: () => this.suggestionsService.reset(),
    });
  }
}
