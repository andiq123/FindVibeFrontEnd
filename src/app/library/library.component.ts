import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { SongComponent } from '../songs/song/song.component';
import { LibraryService } from './services/library.service';
import { UserService } from './services/user.service';
import { UserFormComponent } from './components/user-form/user-form.component';
import { TitleCasePipe } from '@angular/common';
import { StorageInfoComponent } from './components/storage-info/storage-info.component';
import { catchError, Subscription, tap } from 'rxjs';
import { SongsWrapperComponent } from './components/songs-wrapper/songs-wrapper.component';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PlaylistService } from '../services/playlist.service';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [
    SongComponent,
    UserFormComponent,
    TitleCasePipe,
    StorageInfoComponent,
    SongsWrapperComponent,
    FontAwesomeModule,
  ],
  templateUrl: './library.component.html',
  styleUrl: './library.component.scss',
})
export class LibraryComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];
  songs = computed(() => this.libraryService.songs$());
  orderHasChanged = computed(() => this.libraryService.orderHasChanged());

  loadingReorder = signal<boolean>(false);

  isLoggedIn = computed(() => !!this.userService.user$());
  username = computed(() => this.userService.user$()?.name || '');
  userId = computed(() => this.userService.user$()?.id || '');

  loadingSongs = signal<boolean>(true);

  faCheck = faCheck;
  faXmark = faXmark;

  constructor(
    private libraryService: LibraryService,
    private userService: UserService,
    private playlistService: PlaylistService
  ) {}

  ngOnInit(): void {
    if (this.isLoggedIn()) {
      this.loadLibrary();
    } else {
      this.registerWaitForNewUser();
    }
  }

  onChangePlaylist() {
    this.playlistService.setCurrentPlaylist(this.songs());
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

  reorderSongs(data: { from: string; to: string }) {
    this.libraryService.changePlaces(data.from, data.to);
  }

  cancelReorders() {
    this.libraryService.resetReorder();
  }

  saveReorders() {
    this.loadingReorder.set(true);
    this.libraryService
      .saveReorders()
      .pipe(
        catchError(() => {
          this.loadingReorder.set(false);
          return [];
        }),
        tap(() => {
          this.loadingReorder.set(false);
        })
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private registerWaitForNewUser() {
    this.subscriptions.push(
      this.userService.userLoggedIn.subscribe(() => {
        this.loadLibrary();
      })
    );
  }
}
