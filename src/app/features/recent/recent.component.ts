import { Component, OnInit, signal } from '@angular/core';
import { Song } from '../../core/models/song.model';
import { RecentService } from './services/recent.service';
import { SongComponent } from '../search/song/song.component';
import { PlaylistService } from '../../core/services/playlist.service';

@Component({
  selector: 'app-recent',
  standalone: true,
  imports: [SongComponent],
  templateUrl: './recent.component.html',
  styleUrl: './recent.component.scss',
})
export class RecentComponent implements OnInit {
  songs = signal<Song[]>([]);

  constructor(
    private recentService: RecentService,
    private playlistService: PlaylistService
  ) {}

  ngOnInit(): void {
    this.songs.set(this.recentService.getRecentSongs());
  }

  onChangePlaylist() {
    this.playlistService.setCurrentPlaylist(this.songs());
  }
}
