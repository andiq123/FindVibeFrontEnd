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
import {
  faArrowDown,
  faArrowUp,
  faCheck,
  faXmark,
} from "../../shared/icons";
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
  selectMode = signal(false);
  selectedIds = signal<ReadonlySet<string>>(new Set());
  /** Vault order as stored (newest / Spotify block on top). */
  songs = this.libraryService.songs;
  songCount = computed(() => this.songs().length);
  selectedCount = computed(() => this.selectedIds().size);
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
  faArrowUp = faArrowUp;
  faArrowDown = faArrowDown;

  /** Snapshot before first drag/bulk move — instant Discard, no refetch. */
  private reorderSnapshot: Song[] | null = null;

  onChangePlaylist() {
    this.playlistService.setCurrentPlaylist(this.songs());
  }

  toggleSelectMode() {
    if (this.selectMode()) {
      this.selectMode.set(false);
      this.selectedIds.set(new Set());
      return;
    }
    this.selectMode.set(true);
  }

  toggleSongSelect(id: string) {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

  moveSelected(dest: "top" | "bottom" | "up" | "down") {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.markReordered();
    if (!this.libraryService.moveSelected(ids, dest)) {
      // No-op at edge — drop dirty flag if nothing else changed.
      if (this.reorderSnapshot) {
        const same = this.songs().every(
          (s, i) => s.id === this.reorderSnapshot![i]?.id,
        );
        if (same) {
          this.hasReordered.set(false);
          this.reorderSnapshot = null;
        }
      }
    }
  }

  reorderSongs(data: { from: string; to: string }) {
    this.markReordered();
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
    this.selectedIds.set(new Set());
  }

  private markReordered() {
    if (!this.hasReordered()) {
      this.reorderSnapshot = this.songs().map((s) => ({ ...s }));
      this.hasReordered.set(true);
    }
  }
}
