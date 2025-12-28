import { Component, input, output, computed } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { PlayerStatus } from '../models/player.model';
import { PlayerButtonComponent } from '../../../shared/player-button/player-button.component';
import { MovingTitleComponent } from '../../../shared/moving-title/moving-title.component';
import { Song } from '../../../core/models/song.model';

@Component({
    selector: 'app-mini-player',
    imports: [FontAwesomeModule, PlayerButtonComponent, MovingTitleComponent],
    templateUrl: './mini-player.component.html',
    styleUrl: './mini-player.component.scss'
})
export class MiniPlayerComponent {
  song = input.required<Song>();
  status = input.required<PlayerStatus>();
  progress = input<number>(0); // 0-100
  toggleSizeEvent = output<void>();

  playerStatus = PlayerStatus;
  faArrowUp = faArrowUp;

  // Computed properties for cleaner template
  isPlaying = computed(() => this.status() === PlayerStatus.Playing);
  
  toggleSize() {
    this.toggleSizeEvent.emit();
  }
}
