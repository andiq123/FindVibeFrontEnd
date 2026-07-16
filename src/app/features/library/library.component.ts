import {
  Component,
  computed,
  signal,
  inject,
  ChangeDetectionStrategy,
  DestroyRef,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { LibraryService } from "./services/library.service";
import { UserService } from "./services/user.service";
import { UserFormComponent } from "./components/user-form/user-form.component";
import { TitleCasePipe } from "@angular/common";
import { finalize } from "rxjs";
import { faCheck, faXmark } from "../../shared/icons";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { PlaylistService } from "../../core/services/playlist.service";
import { SettingsService } from "../../core/services/settings.service";
import { PageContentComponent } from "../../shared/components/page-content/page-content.component";
import { SongListComponent } from "../../shared/components/song-list/song-list.component";
import { Song } from "../../core/models/song.model";
import { SpotifyImportComponent } from "./components/spotify-import/spotify-import.component";

@Component({
  selector: "app-library",
  standalone: true,
  imports: [
    UserFormComponent,
    TitleCasePipe,
    FontAwesomeModule,
    PageContentComponent,
    SongListComponent,
    SpotifyImportComponent,
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
  private destroyRef = inject(DestroyRef);

  hasReordered = signal(false);
  /** Vault order as stored (newest / Spotify block on top). */
  songs = this.libraryService.songs;
  songCount = computed(() => this.songs().length);
  isLoggedIn = computed(() => !!this.userService.user());
  username = computed(() => this.userService.user()?.username || "");
  loadingSongs = this.libraryService.loadingSongs;
  loadingReorder = signal(false);
  /** Mini player visible → bar sits above it; else occupies the mini slot. */
  aboveMini = computed(
    () =>
      !!this.playlistService.currentSong() &&
      this.settingsService.isMiniPlayer(),
  );

  faCheck = faCheck;
  faXmark = faXmark;

  /** Snapshot before first drag — instant Discard, no refetch. */
  private reorderSnapshot: Song[] | null = null;

  onChangePlaylist() {
    this.playlistService.setCurrentPlaylist(this.songs());
  }

  reorderSongs(data: { from: string; to: string }) {
    if (!this.hasReordered()) {
      this.reorderSnapshot = this.songs().map((s) => ({ ...s }));
      this.hasReordered.set(true);
    }
    this.libraryService.changePlaces(data.from, data.to);
  }

  saveReorders() {
    if (this.loadingReorder()) return;
    this.loadingReorder.set(true);
    this.libraryService
      .saveReorders()
      .pipe(
        finalize(() => this.loadingReorder.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.hasReordered.set(false);
          this.reorderSnapshot = null;
        },
      });
  }

  cancelReorders() {
    if (this.loadingReorder()) return;
    if (this.reorderSnapshot) {
      this.libraryService.replaceSongs(this.reorderSnapshot);
    }
    this.hasReordered.set(false);
    this.reorderSnapshot = null;
  }
}
