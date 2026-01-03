import {
  Component,
  computed,
  effect,
  input,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";

import { SearchBarComponent } from "./search-bar/search-bar.component";
import { PageLayoutComponent } from "../../shared/components/page-layout/page-layout.component";
import { SongListComponent } from "../../shared/components/song-list/song-list.component";
import { PaginationComponent } from "../../shared/components/pagination/pagination.component";
import { SearchStatus } from "../../core/models/song.model";
import { Router } from "@angular/router";
import { SearchService } from "./services/search.service";
import { SettingsService } from "../../core/services/settings.service";
import { PlayerService } from "../../core/services/player.service";
import { PlaylistService } from "../../core/services/playlist.service";
import { EmptyStateComponent } from "../../shared/empty-state/empty-state.component";

import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import {
  faMagnifyingGlass,
  faTriangleExclamation,
  faWaveSquare,
  faMusic,
} from "../../shared/icons";

@Component({
  selector: "app-search-page",
  standalone: true,
  imports: [
    SearchBarComponent,
    FontAwesomeModule,
    EmptyStateComponent,
    PageLayoutComponent,
    SongListComponent,
    PaginationComponent,
  ],
  templateUrl: "./search-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPageComponent {
  private router = inject(Router);
  private songsService = inject(SearchService);
  private settingsService = inject(SettingsService);
  private playlistService = inject(PlaylistService);
  public playerService = inject(PlayerService);

  query = input<string>("");

  songs = computed(() => this.songsService.songs());
  status = computed(() => this.songsService.status());
  pagination = computed(() => this.songsService.pagination());
  currentPage = computed(() => this.songsService.currentPage());
  isCheckedServer = computed(() => this.settingsService.isCheckedServer());

  searchStatus = SearchStatus;

  faMagnifyingGlass = faMagnifyingGlass;
  faTriangleExclamation = faTriangleExclamation;
  faWaveSquare = faWaveSquare;
  faMusic = faMusic;

  constructor() {
    effect(() => {
      if (
        this.settingsService.isServerDown() &&
        this.router.url !== "/library"
      ) {
        this.router.navigate(["/library"]);
      }
    });
  }

  onChangePlaylist(): void {
    this.playlistService.setCurrentPlaylist(this.songs());
  }

  onPageChange(page: number): void {
    const query = this.query();
    if (!query) return;

    this.songsService.searchSongs(query, page).subscribe();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
