import { Component, input, output } from '@angular/core';
import { SongComponent } from '../../../search/song/song.component';
import { Song } from '../../../../core/models/song.model';

@Component({
    selector: 'app-songs-wrapper',
    imports: [SongComponent],
    templateUrl: './songs-wrapper.component.html',
    styleUrl: './songs-wrapper.component.scss'
})
export class SongsWrapperComponent {
  songs = input<Song[]>();
  onReorderSongs = output<{ from: string; to: string }>();
  onChangePlaylist = output();

  reorderSongs(data: { from: string; to: string }) {
    this.onReorderSongs.emit(data);
  }

  changePlaylist() {
    this.onChangePlaylist.emit();
  }
}
