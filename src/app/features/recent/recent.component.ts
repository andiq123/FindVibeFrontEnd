import { Component, OnInit, signal, inject } from '@angular/core';
import { Song } from '../../core/models/song.model';
import { RecentService } from './services/recent.service';
import { SongComponent } from '../search/song/song.component';
import { PlaylistService } from '../../core/services/playlist.service';
import { PlayerService } from '../../core/services/player.service';

@Component({
    selector: 'app-recent',
    imports: [SongComponent],
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
}
