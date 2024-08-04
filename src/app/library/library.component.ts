import {Component, OnInit, signal, Signal} from '@angular/core';
import {LibraryService} from "./library.service";
import {Song} from "../songs/models/song.model";
import {SongComponent} from "../songs/song/song.component";
import {FormsModule} from "@angular/forms";
import {User} from "./models/user.model";

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [
    SongComponent,
    FormsModule
  ],
  templateUrl: './library.component.html',
  styleUrl: './library.component.scss'
})
export class LibraryComponent implements OnInit {
  songs!: Signal<Song[]>;
  user!: Signal<User | undefined>;
  name = signal<string>('');

  constructor(private libraryService: LibraryService) {
  }

  ngOnInit(): void {
    this.songs = this.libraryService.songs$;
    this.user = this.libraryService.user$;
  }

  setUpUser() {
    this.libraryService.registerOrGetUser(this.name());
  }

  changeUser() {
    this.libraryService.resetUser();
  }
}
