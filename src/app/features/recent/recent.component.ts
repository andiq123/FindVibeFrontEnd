import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { Song } from '../../core/models/song.model';
import { RecentService } from './services/recent.service';
import { SongComponent } from '../../shared/song/song.component';
import { PlaylistService } from '../../core/services/playlist.service';
import { PlayerService } from '../../core/services/player.service';
import { PullToRefreshDirective } from '../../shared/directives/pull-to-refresh.directive';

@Component({
    selector: 'app-recent',
    imports: [SongComponent, PullToRefreshDirective],
    templateUrl: './recent.component.html',
    styleUrl: './recent.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentComponent {
  private recentService = inject(RecentService);
  private playlistService = inject(PlaylistService);
  public playerService = inject(PlayerService);

  songs = this.recentService.songs;

  onChangePlaylist() {
    this.playlistService.setCurrentPlaylist(this.songs());
  }

  handleRefresh() {
    this.recentService.refreshRecentSongs();
  }
}
