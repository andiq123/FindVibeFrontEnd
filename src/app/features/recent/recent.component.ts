import { Component, OnInit, signal, inject } from '@angular/core';
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
    styleUrl: './recent.component.scss'
})
export class RecentComponent implements OnInit {
  private recentService = inject(RecentService);
  private playlistService = inject(PlaylistService);
  public playerService = inject(PlayerService);

  songs = signal<Song[]>([]);

  ngOnInit(): void {
    this.songs.set(this.recentService.getRecentSongs());
  }

  onChangePlaylist() {
    this.playlistService.setCurrentPlaylist(this.songs());
  }

  handleRefresh() {
    this.songs.set(this.recentService.getRecentSongs());
  }
}
