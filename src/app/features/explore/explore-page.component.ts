import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { PageContentComponent } from "../../shared/components/page-content/page-content.component";
import { SearchBarComponent } from "../search/search-bar/search-bar.component";
import { PlayerService } from "../../core/services/player.service";
import { ExploreService, ExploreSection } from "./explore.service";
import { Song } from "../../core/models/song.model";
import { faArrowRotateRight } from "../../shared/icons";

@Component({
  selector: "app-explore-page",
  standalone: true,
  imports: [PageContentComponent, SearchBarComponent, FaIconComponent],
  templateUrl: "./explore-page.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplorePageComponent implements OnInit {
  readonly explore = inject(ExploreService);
  private readonly player = inject(PlayerService);

  readonly faArrowRotateRight = faArrowRotateRight;
  readonly skeletons = [0, 1, 2];

  ngOnInit(): void {
    void this.explore.load();
  }

  onRefresh(): void {
    void this.explore.refresh();
  }

  /** Shelf songs are already search-resolved — play the list as-is. */
  playFromShelf(section: ExploreSection, song: Song): void {
    void this.player.playFromList(section.songs, song);
  }

  cover(song: Song): string {
    return song.image?.trim() || "no_album_art.jpg";
  }
}
