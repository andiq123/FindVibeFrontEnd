import { Component, input } from '@angular/core';
import { PlayerStatus } from '../../components/player-wrapper/models/player.model';
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

  playerStatus = PlayerStatus;

  faPlay = faPlay;
  faPause = faPause;
}
