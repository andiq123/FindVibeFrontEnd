import { Component, OnInit, signal } from '@angular/core';
import { Song } from '../songs/models/song.model';
import { RecentService } from './services/recent.service';
import { SongComponent } from '../songs/song/song.component';

@Component({
  selector: 'app-recent',
  standalone: true,
  imports: [SongComponent],
  templateUrl: './recent.component.html',
  styleUrl: './recent.component.scss',
})
export class RecentComponent implements OnInit {
  songs = signal<Song[]>([]);

  constructor(private recentService: RecentService) {}

  ngOnInit(): void {
    this.songs.set(this.recentService.getRecentSongs());
  }
}
