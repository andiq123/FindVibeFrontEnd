import { Component, OnInit, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { FormsModule } from '@angular/forms';
import { SongsService } from '../songs.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FontAwesomeModule, FormsModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchComponent implements OnInit {
  searchTerm = signal<string>('mgl');

  faMagnifyingGlass = faMagnifyingGlass;
  constructor(private songsService: SongsService) {}

  ngOnInit(): void {
    this.songsService.searchSongs(this.searchTerm()).subscribe();
  }

  submit() {
    this.songsService.searchSongs(this.searchTerm()).subscribe();
  }
}
