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
  timeOut: ReturnType<typeof setTimeout> | undefined;

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
      clearTimeout(this.timeOut);
      setTimeout(() => {
        this.suggestionsService.reset();
      }, 300);
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
    }, 300);
  }

  private async setQueryParamsToCurrentSearchTerm() {
    await this.router.navigate([`/songs/${this.searchTerm()}`]);
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
    if (this.query() === '' || this.query() === undefined) return;

    this.searchTerm.set(this.query() || '');
    this.songsService.searchSongs(this.searchTerm()).subscribe();
  }
}
