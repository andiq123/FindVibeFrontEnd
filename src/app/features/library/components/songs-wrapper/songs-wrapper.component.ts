import { Component, input, output } from '@angular/core';
import { SongComponent } from '../../../../shared/song/song.component';
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
  reorder = output<{ from: string; to: string }>();
  playlistChange = output<void>();

  public playerService = inject(PlayerService);

  emitReorder(data: { from: string; to: string }) {
    this.reorder.emit(data);
  }

  emitPlaylistChange() {
    this.playlistChange.emit();
  }
}
