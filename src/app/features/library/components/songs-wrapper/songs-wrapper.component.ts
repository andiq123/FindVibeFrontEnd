import { Component, input, output, inject, ChangeDetectionStrategy } from '@angular/core';
import { Song } from '../../../../core/models/song.model';
import { SongComponent } from '../../../../shared/song/song.component';
import { PlayerService } from '../../../../core/services/player.service';
import { EmptyStateComponent } from '../../../../shared/empty-state/empty-state.component';
import { faMusic } from '@fortawesome/free-solid-svg-icons';

@Component({
    selector: 'app-songs-wrapper',
    imports: [SongComponent, EmptyStateComponent],
    templateUrl: './songs-wrapper.component.html',
    styleUrl: './songs-wrapper.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongsWrapperComponent {
  songs = input.required<Song[]>();
  reorder = output<{ from: string; to: string }>();
  playlistChange = output<void>();
  
  faMusic = faMusic;

  public playerService = inject(PlayerService);

  emitReorder(data: { from: string; to: string }) {
    this.reorder.emit(data);
  }

  emitPlaylistChange() {
    this.playlistChange.emit();
  }
}
