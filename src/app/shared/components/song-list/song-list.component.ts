import { Component, ChangeDetectionStrategy, input, output, inject } from '@angular/core';
import { Song } from '../../../core/models/song.model';
import { SongComponent } from '../../song/song.component';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { LoadingBallsComponent } from '../../loading-balls/loading-balls.component';
import { faMusic, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-song-list',
  template: `
    @if (isLoading()) {
      <div class="flex flex-col items-center justify-center p-12 gap-4">
        <app-loading-balls />
        <p class="text-sm opacity-50">Loading vibes...</p>
      </div>
    } @else {
      <ul class="flex flex-col">
        @for (song of songs(); track song.id) {
          <li class="group/item list-none">
            <app-song
              [song]="song"
              [isFavoritePage]="allowReorder()"
              [allowReorder]="allowReorder()"
              (reorder)="emitReorder($event)"
              (playlistChange)="emitPlaylistChange()"
            />
          </li>
        } @empty {
          <app-empty-state
            [icon]="emptyStateIcon()"
            [title]="emptyStateTitle()"
            [description]="emptyStateDescription()"
          />
        }
      </ul>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
  standalone: true,
  imports: [SongComponent, EmptyStateComponent, LoadingBallsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongListComponent {
    songs = input.required<Song[]>();
    isLoading = input(false);
    allowReorder = input(false);
    
    emptyStateIcon = input<IconDefinition>(faMusic);
    emptyStateTitle = input('No songs found');
    emptyStateDescription = input('Try searching for something else.');

    reorder = output<{ from: string; to: string }>();
    playlistChange = output<void>();

    emitReorder(event: { from: string; to: string }) {
        this.reorder.emit(event);
    }

    emitPlaylistChange() {
        this.playlistChange.emit();
    }
}
