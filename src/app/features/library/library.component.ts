import {
  Component,
  computed,
  signal,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { ModalService } from "../../core/services/modal.service";
import { LibraryService } from "./services/library.service";
import { UserService } from "./services/user.service";
import { UserFormComponent } from "./components/user-form/user-form.component";
import { TitleCasePipe } from "@angular/common";
import { StorageInfoComponent } from "./components/storage-info/storage-info.component";
import { OfflineStorageService } from "./services/offline-storage.service";
import { catchError, tap } from "rxjs";

import {
  faRightFromBracket,
  faArrowDown,
  faCircleNotch,
  faWaveSquare,
  faCheck,
  faXmark,
} from "../../shared/icons";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { PlaylistService } from "../../core/services/playlist.service";
import { SettingsService } from "../../core/services/settings.service";

import { PageLayoutComponent } from "../../shared/components/page-layout/page-layout.component";
import { SongListComponent } from "../../shared/components/song-list/song-list.component";

@Component({
  selector: "app-library",
  imports: [
    UserFormComponent,
    TitleCasePipe,
    FontAwesomeModule,
    PageLayoutComponent,
    SongListComponent,
  ],
  templateUrl: "./library.component.html",
  styleUrl: "./library.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryComponent {
  private libraryService = inject(LibraryService);
  private userService = inject(UserService);
  private playlistService = inject(PlaylistService);
  private settingsService = inject(SettingsService);
  private modalService = inject(ModalService);

  public offlineStorageService = inject(OfflineStorageService);

  songs = computed(() => this.libraryService.songs());
  isLoggedIn = computed(() => !!this.userService.user());
  username = computed(() => this.userService.user()?.username || "");
  userId = computed(() => this.userService.user()?.id || "");
  isOffline = this.settingsService.isOffline;
  isCheckedServer = this.settingsService.isCheckedServer;

  loadingSongs = this.libraryService.loadingSongs;
  hasReordered = signal(false);
  loadingReorder = signal(false);

  faRightFromBracket = faRightFromBracket;
  faArrowDown = faArrowDown;
  faCircleNotch = faCircleNotch;
  faWaveSquare = faWaveSquare;
  faCheck = faCheck;
  faXmark = faXmark;

  isDownloading = computed(
    () => this.offlineStorageService.currentLoadingDownloadSongIds().length > 0,
  );
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
    this.hasReordered.set(true);
  }

  saveReorders() {
    this.loadingReorder.set(true);
    this.libraryService
      .saveReorders()
      .pipe(
        tap(() => {
          this.loadingReorder.set(false);
          this.hasReordered.set(false);
        }),
        catchError((err) => {
          this.loadingReorder.set(false);
          throw err;
        }),
      )
      .subscribe();
  }

  cancelReorders() {
    this.libraryService.updateLibrarySongs(this.userId()).subscribe(() => {
      this.hasReordered.set(false);
    });
  }
}
