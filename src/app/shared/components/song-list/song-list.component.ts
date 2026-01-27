import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from "@angular/core";
import { Song } from "../../../core/models/song.model";
import { SongComponent } from "../../song/song.component";
import { EmptyStateComponent } from "../../empty-state/empty-state.component";
import { SkeletonComponent } from "../skeleton/skeleton.component";
import { faMusic, IconDefinition } from "../../icons";
@Component({
  selector: "app-song-list",
  template: `
    @if (isLoading()) {
      <app-skeleton type="song" [count]="skeletonCount()" />
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
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  standalone: true,
  imports: [SongComponent, EmptyStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongListComponent {
  songs = input.required<Song[]>();
  isLoading = input(false);
  allowReorder = input(false);
  skeletonCount = input(5);
  emptyStateIcon = input<IconDefinition>(faMusic);
  emptyStateTitle = input("No songs found");
  emptyStateDescription = input("Try searching for something else.");
  reorder = output<{ from: string; to: string }>();
  playlistChange = output<void>();
  emitReorder(event: { from: string; to: string }) {
    this.reorder.emit(event);
  }
  emitPlaylistChange() {
    this.playlistChange.emit();
  }
}
