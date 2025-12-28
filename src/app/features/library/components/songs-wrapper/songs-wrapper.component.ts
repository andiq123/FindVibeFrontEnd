import { Component, input, output } from '@angular/core';
import { SongComponent } from '../../../search/song/song.component';
import { Song } from '../../../../core/models/song.model';
import { PlayerService } from '../../../../core/services/player.service';
import { inject } from '@angular/core';

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

  public playerService = inject(PlayerService);

  reorderSongs(data: { from: string; to: string }) {
    this.onReorderSongs.emit(data);
  }

  changePlaylist() {
    this.onChangePlaylist.emit();
  }
}
