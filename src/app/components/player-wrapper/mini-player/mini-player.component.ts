import { Component, computed, input, output } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { PlayerStatus } from '../models/player.model';
import { PlayerButtonComponent } from '../../../shared/player-button/player-button.component';
import { MovingTitleComponent } from '../../../shared/moving-title/moving-title.component';
import { NgOptimizedImage } from '@angular/common';
import { Song } from '../../../songs/models/song.model';

@Component({
  selector: 'app-mini-player',
  standalone: true,
  imports: [
    FontAwesomeModule,
    PlayerButtonComponent,
    MovingTitleComponent,
    NgOptimizedImage,
  ],
  templateUrl: './mini-player.component.html',
  styleUrl: './mini-player.component.scss',
})
export class MiniPlayerComponent {
  song = input.required<Song>();
  status = input.required<PlayerStatus>();
  onToggleSize = output<void>();

  playerStatus = PlayerStatus;

  faArrowUp = faArrowUp;

  toggleSize() {
    this.onToggleSize.emit();
  }
}
