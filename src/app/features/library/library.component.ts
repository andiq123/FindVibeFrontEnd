import { Component, computed, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { ModalService } from '../../core/services/modal.service';
import { LibraryService } from './services/library.service';
import { UserService } from './services/user.service';
import { UserFormComponent } from './components/user-form/user-form.component';
import { TitleCasePipe } from '@angular/common';
import { StorageInfoComponent } from './components/storage-info/storage-info.component';
import { OfflineStorageService } from './services/offline-storage.service';
import { catchError, tap } from 'rxjs';

import {
  faCheck,
  faXmark,
  faRightFromBracket,
  faArrowDown,
  faCircleNotch,
  faWaveSquare
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PlaylistService } from '../../core/services/playlist.service';
import { SettingsService } from '../../core/services/settings.service';

import { PageLayoutComponent } from '../../shared/components/page-layout/page-layout.component';
import { SongListComponent } from '../../shared/components/song-list/song-list.component';

@Component({
    selector: 'app-library',
    imports: [
        UserFormComponent,
        TitleCasePipe,
        FontAwesomeModule,
        PageLayoutComponent,
        SongListComponent
    ],
    templateUrl: './library.component.html',
    styleUrl: './library.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LibraryComponent {
  private libraryService = inject(LibraryService);
  private userService = inject(UserService);
  private playlistService = inject(PlaylistService);
  private settingsService = inject(SettingsService);
  private modalService = inject(ModalService);

  public offlineStorageService = inject(OfflineStorageService);

  songs = computed(() => this.libraryService.songs());
  orderHasChanged = computed(() => this.libraryService.orderHasChanged());
  isLoggedIn = computed(() => !!this.userService.user());
  username = computed(() => this.userService.user()?.username || '');
  userId = computed(() => this.userService.user()?.id || '');
  isOffline = this.settingsService.isOffline;
  isCheckedServer = this.settingsService.isCheckedServer;

  loadingReorder = signal(false);
  loadingSongs = this.libraryService.loadingSongs;

  faCheck = faCheck;
  faXmark = faXmark;
  faRightFromBracket = faRightFromBracket;
  faArrowDown = faArrowDown;
  faCircleNotch = faCircleNotch;
  faWaveSquare = faWaveSquare;

  isDownloading = computed(() => this.offlineStorageService.currentLoadingDownloadSongIds().length > 0);
  showStorageDot = computed(() => {
    return this.offlineStorageService.availableOfflineSongIds().length > 0;
  });

  openStorageInfo() {
    this.modalService.open(StorageInfoComponent);
  }

  onChangePlaylist() {
    this.playlistService.setCurrentPlaylist(this.songs());
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
}
