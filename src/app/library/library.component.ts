import {
  Component,
  computed,
  effect,
  OnDestroy,
  OnInit,
  signal,
  Signal,
} from '@angular/core';
import { SongComponent } from '../songs/song/song.component';
import { LibraryService } from './services/library.service';
import { UserService } from './services/user.service';
import { UserFormComponent } from './components/user-form/user-form.component';
import { TitleCasePipe } from '@angular/common';
import { StorageInfoComponent } from './components/storage-info/storage-info.component';
import { catchError, Subscription } from 'rxjs';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [
    SongComponent,
    UserFormComponent,
    TitleCasePipe,
    StorageInfoComponent,
  ],
  templateUrl: './library.component.html',
  styleUrl: './library.component.scss',
})
export class LibraryComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];
  songs = computed(() => this.libraryService.songs$());
  isLoggedIn = computed(() => !!this.userService.user$());
  username = computed(() => this.userService.user$()?.name || '');
  userId = computed(() => this.userService.user$()?.id || '');

  loadingSongs = signal<boolean>(true);

  constructor(
    private libraryService: LibraryService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    if (this.isLoggedIn()) {
      this.loadLibrary();
    } else {
      this.registerWaitForNewUser();
    }
  }

  loadLibrary() {
    this.libraryService.updateLibrarySongs(this.userId()).subscribe(() => {
      this.loadingSongs.set(false);
    });
  }

  changeUser() {
    this.userService.resetUser();
    this.registerWaitForNewUser();
  }

  private registerWaitForNewUser() {
    this.subscriptions.push(
      this.userService.userLoggedIn.subscribe(() => {
        this.loadLibrary();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}
