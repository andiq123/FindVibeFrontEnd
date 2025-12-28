import { Component, computed, OnDestroy, signal, inject } from '@angular/core';
import { LibraryService } from './services/library.service';
import { UserService } from './services/user.service';
import { UserFormComponent } from './components/user-form/user-form.component';
import { TitleCasePipe } from '@angular/common';
import { StorageInfoComponent } from './components/storage-info/storage-info.component';
import { OfflineStorageService } from './services/offline-storage.service';
import { catchError, Subscription, tap } from 'rxjs';
import { SongsWrapperComponent } from './components/songs-wrapper/songs-wrapper.component';
import { PullToRefreshDirective } from '../../shared/directives/pull-to-refresh.directive';
import {
  faCheck,
  faXmark,
  faRightFromBracket,
  faArrowDown,
  faCircleNotch,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PlaylistService } from '../../core/services/playlist.service';
import { SettingsService } from '../../core/services/settings.service';

@Component({
    selector: 'app-library',
    imports: [
        UserFormComponent,
        TitleCasePipe,
        StorageInfoComponent,
        SongsWrapperComponent,
        FontAwesomeModule,
        PullToRefreshDirective,
    ],
    templateUrl: './library.component.html',
    styleUrl: './library.component.scss'
})
export class LibraryComponent implements OnDestroy {
  private libraryService = inject(LibraryService);
  private userService = inject(UserService);
  private playlistService = inject(PlaylistService);
  private settingsService = inject(SettingsService);

  public offlineStorageService = inject(OfflineStorageService);

  private subscriptions: Subscription[] = [];
  songs = computed(() => this.libraryService.songs());
  orderHasChanged = computed(() => this.libraryService.orderHasChanged());
  isLoggedIn = computed(() => !!this.userService.user());
  username = computed(() => this.userService.user()?.username || '');
  userId = computed(() => this.userService.user()?.id || '');
  isOffline = this.settingsService.isOffline;

  loadingReorder = signal(false);
  loadingSongs = this.libraryService.loadingSongs;

  faCheck = faCheck;
  faXmark = faXmark;
  faRightFromBracket = faRightFromBracket;
  faArrowDown = faArrowDown;
  faCircleNotch = faCircleNotch;

  isDownloading = computed(() => this.offlineStorageService.currentLoadingDownloadSongIds().length > 0);
  showStorageDot = computed(() => {
    return this.offlineStorageService.availableOfflineSongIds().length > 0;
  });

  onChangePlaylist() {
    this.playlistService.setCurrentPlaylist(this.songs());
  }

  handleRefresh() {
    if (this.userId()) {
      this.libraryService.updateLibrarySongs(this.userId()).subscribe();
    }
  }

  changeUser() {
    this.playlistService.reset();
    this.userService.resetUser();
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
}
