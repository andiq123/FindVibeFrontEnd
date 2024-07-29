import { Component, effect, OnInit, Signal, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { FormsModule } from '@angular/forms';
import { SongsService } from '../songs.service';
import { SuggestionsService } from '../suggestions.service';
import { TitleCasePipe } from '@angular/common';

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
    private suggestionsService: SuggestionsService
  ) {}

  ngOnInit(): void {
    this.suggestions = this.suggestionsService.suggestions$;
  }

  addSuggestion(suggestion: string) {
    this.searchTerm.set(suggestion);
    this.submit();
    this.suggestionsService.reset();
  }

  search(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);

    if (this.timeOut) {
      clearTimeout(this.timeOut);
    }

    this.timeOut = setTimeout(() => {
      if (this.searchTerm() === '') {
        this.suggestionsService.reset();
        return;
      }
      this.suggestionsService.getSuggestions(this.searchTerm()).subscribe();
    }, 200);
  }

  submit() {
    if (this.searchTerm() === '') return;
    this.songsService.searchSongs(this.searchTerm()).subscribe();
  }
}
