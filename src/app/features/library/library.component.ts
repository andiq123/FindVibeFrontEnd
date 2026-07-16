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
import { catchError, tap } from "rxjs";
import { faCheck, faXmark } from "../../shared/icons";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { PlaylistService } from "../../core/services/playlist.service";
import { PageContentComponent } from "../../shared/components/page-content/page-content.component";
import { SongListComponent } from "../../shared/components/song-list/song-list.component";
@Component({
  selector: "app-library",
  standalone: true,
  imports: [
    UserFormComponent,
    TitleCasePipe,
    FontAwesomeModule,
    PageContentComponent,
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
  private destroyRef = inject(DestroyRef);
  songs = computed(() => this.libraryService.songs());
  isLoggedIn = computed(() => !!this.userService.user());
  username = computed(() => this.userService.user()?.username || "");
  userId = computed(() => this.userService.user()?.id || "");
  loadingSongs = this.libraryService.loadingSongs;
  hasReordered = signal(false);
  loadingReorder = signal(false);
  faCheck = faCheck;
  faXmark = faXmark;
  onChangePlaylist() {
    this.playlistService.setCurrentPlaylist(this.songs());
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
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
  cancelReorders() {
    this.libraryService.updateLibrarySongs(this.userId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.hasReordered.set(false);
      });
  }
}
