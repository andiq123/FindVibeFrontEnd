import { Component, input, output } from '@angular/core';
import { PlayerStatus } from '../../player-wrapper/models/player.model';
import { faPause, faPlay } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-player-button',
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: './player-button.component.html',
  styleUrl: './player-button.component.scss',
})
export class PlayerButtonComponent {
  status = input.required<PlayerStatus>();
  onPlay = output<void>();
  onPause = output<void>();

  playerStatus = PlayerStatus;

  faPlay = faPlay;
  faPause = faPause;

  play() {
    this.onPlay.emit();
  }

  pause() {
    this.onPause.emit();
  }
}
