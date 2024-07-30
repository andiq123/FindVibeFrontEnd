import {
  Component,
  effect,
  OnInit,
  output,
  signal,
  Signal,
} from '@angular/core';
import { Song } from '../../songs/models/song.model';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowUp, faPause, faPlay } from '@fortawesome/free-solid-svg-icons';
import { PlayerService } from '../player.service';
import { PlayerStatus } from '../models/player.model';
import { PlayerButtonComponent } from '../../shared/player-button/player-button.component';
import { MovingTitleComponent } from '../../shared/moving-title/moving-title.component';

const song: Song = {
  id: 'b8fe0bc1-d627-4689-999d-6bd9456c5fd5',
  title: 'Allegro Ventigo (Feat. Matteo)',
  artist: 'Dan Bălan',
  image:
    'https://lh3.googleusercontent.com/M5NWQnDh87OTs6IW…v9oNtyysOi97QdaHIR2OcfB92PZ35hZ_=w350-h350-l90-rj',
  link: 'https://cdn.muzkan.net/?h=JGraYpdVSCkMwl1cGWtcIc7u…0kFF_E8uhno7JTV_phjeHpqR-jMYCjHGBXg7CRVhq0mKgY0gW',
};

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

  faArrowUp = faArrowUp;

  constructor(private playerService: PlayerService) {}

  ngOnInit(): void {
    this.song = this.playerService.song$;
    this.status = this.playerService.status$;
  }

  toggleSize() {
    this.onToggleSize.emit();
  }
}
