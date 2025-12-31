import { Component, inject, ChangeDetectionStrategy } from "@angular/core";
import { RecentService } from "./services/recent.service";
import { PlaylistService } from "../../core/services/playlist.service";
import { PageLayoutComponent } from "../../shared/components/page-layout/page-layout.component";
import { SongListComponent } from "../../shared/components/song-list/song-list.component";
import { PlayerService } from "../../core/services/player.service";

@Component({
  selector: "app-recent",
  imports: [PageLayoutComponent, SongListComponent],
  templateUrl: "./recent.component.html",
  styleUrl: "./recent.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentComponent {
  private recentService = inject(RecentService);
  private playlistService = inject(PlaylistService);
  public playerService = inject(PlayerService);

  songs = this.recentService.songs;

  onChangePlaylist() {
    this.playlistService.setCurrentPlaylist(this.songs());
  }
}
