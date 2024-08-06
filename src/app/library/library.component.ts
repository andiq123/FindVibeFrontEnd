import {
  Component,
  computed,
  effect,
  OnInit,
  signal,
  Signal,
} from '@angular/core';
import { Song } from '../songs/models/song.model';
import { SongComponent } from '../songs/song/song.component';
import { FormsModule } from '@angular/forms';
import { User } from './models/user.model';
import { LibraryService } from './services/library.service';
import { UserService } from './services/user.service';
import { UserFormComponent } from './components/user-form/user-form.component';
import { TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [SongComponent, UserFormComponent, TitleCasePipe],
  templateUrl: './library.component.html',
  styleUrl: './library.component.scss',
})
export class LibraryComponent implements OnInit {
  songs!: Signal<Song[]>;
  isLoggedIn!: Signal<boolean>;
  username!: Signal<string>;
  songsAreLoading!: Signal<boolean>;

  constructor(
    private libraryService: LibraryService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.songs = this.libraryService.songs$;
    this.songsAreLoading = this.libraryService.loadingSongs$;
    this.isLoggedIn = computed(() => !!this.userService.user$());
    this.username = computed(() => this.userService.user$()?.name || '');
  }

  changeUser() {
    this.userService.resetUser();
  }
}
