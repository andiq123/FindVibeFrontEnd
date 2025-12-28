import { Component, computed, input, OnInit, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { SearchService } from '../services/search.service';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FontAwesomeModule, FormsModule, TitleCasePipe],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
})
export class SearchBarComponent implements OnInit {
  query = input<string>('');
  searchTerm = signal<string>('');
  suggestions = computed(() => this.songsService.suggestions());

  faMagnifyingGlass = faMagnifyingGlass;

  constructor(
    private songsService: SearchService,
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

    if (this.searchTerm() === '') this.songsService.resetSuggestions();
    else this.searchSuggestion();
  }

  async submit() {
    if (this.searchTerm() === '') {
      return;
    }

    await this.setQueryParamsToCurrentSearchTerm();

    this.submitSearchSongs();
    this.songsService.resetSuggestions();
  }

  private async setQueryParamsToCurrentSearchTerm() {
    await this.router.navigate([`/songs/${this.searchTerm()}`]);
  }

  private searchSuggestion() {
    this.songsService.getSuggestions(this.searchTerm()).subscribe({
      error: () => this.songsService.resetSuggestions(),
    });
  }

  private searchIfQueryPresent() {
    if (this.query() === '' || this.query() === undefined) return;

    this.searchTerm.set(this.query() || '');
    this.submitSearchSongs();
    this.songsService.resetSuggestions();
  }

  private submitSearchSongs() {
    this.songsService.searchSongs(this.searchTerm()).subscribe({
      error: () => this.songsService.resetSuggestions(),
    });
  }
}
