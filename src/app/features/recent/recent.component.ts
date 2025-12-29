import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RecentService } from './services/recent.service';
import { SongComponent } from '../../shared/song/song.component';
import { PlaylistService } from '../../core/services/playlist.service';
import { PlayerService } from '../../core/services/player.service';

@Component({
    selector: 'app-recent',
    imports: [SongComponent],
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
}
