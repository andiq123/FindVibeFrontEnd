import { Component, input, output } from '@angular/core';
import { SongComponent } from '../../../songs/song/song.component';
import { Song } from '../../../songs/models/song.model';

@Component({
  selector: 'app-songs-wrapper',
  standalone: true,
  imports: [SongComponent],
  templateUrl: './songs-wrapper.component.html',
  styleUrl: './songs-wrapper.component.scss',
})
export class SongsWrapperComponent {
  songs = input<Song[]>();
  onReorderSongs = output<{ from: string; to: string }>();

  reorderSongs(data: { from: string; to: string }) {
    this.onReorderSongs.emit(data);
  }
}
