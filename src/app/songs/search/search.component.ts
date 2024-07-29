import { Component, OnInit, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { FormsModule } from '@angular/forms';
import { SongsService } from '../songs.service';
import { SuggestionsService } from '../suggestions.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FontAwesomeModule, FormsModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchComponent {
  searchTerm = signal<string>('');

  faMagnifyingGlass = faMagnifyingGlass;
  constructor(
    private songsService: SongsService,
    private suggestionsService: SuggestionsService
  ) {}

  submit() {
    if (this.searchTerm() === '') return;
    // this.songsService.searchSongs(this.searchTerm()).subscribe();
    this.suggestionsService.getSuggestions(this.searchTerm());
  }
}
