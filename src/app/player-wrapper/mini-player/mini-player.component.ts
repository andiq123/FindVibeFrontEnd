import { Component, OnInit, output, Signal } from '@angular/core';
import { Song } from '../../songs/models/song.model';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPause, faPlay } from '@fortawesome/free-solid-svg-icons';
import { PlayerService } from '../player.service';
import { PlayerStatus } from '../models/player.model';
import { PlayerButtonComponent } from '../../shared/player-button/player-button.component';
import { MovingTitleComponent } from '../../shared/moving-title/moving-title.component';

@Component({
  selector: 'app-mini-player',
  standalone: true,
  imports: [FontAwesomeModule, PlayerButtonComponent, MovingTitleComponent],
  templateUrl: './mini-player.component.html',
  styleUrl: './mini-player.component.scss',
})
export class MiniPlayerComponent implements OnInit {
  onToggleSize = output<void>();

  playerStatus = PlayerStatus;

  song!: Signal<Song | null>;
  status!: Signal<PlayerStatus>;

  faPlay = faPlay;
  faPause = faPause;

  constructor(private playerService: PlayerService) {}

  ngOnInit(): void {
    this.song = this.playerService.song$;
    this.status = this.playerService.status$;
  }

  toggleSize() {
    this.onToggleSize.emit();
  }

  play() {
    this.playerService.play();
  }

  pause() {
    this.playerService.pause();
  }
}
