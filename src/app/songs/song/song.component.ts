import { Component, computed, input, OnInit, Signal } from '@angular/core';
import { Song } from '../models/song.model';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PlayerService } from '../../player-wrapper/player.service';
import { PlayerStatus } from '../../player-wrapper/models/player.model';
import { PlayerButtonComponent } from '../../shared/player-button/player-button.component';

@Component({
  selector: 'app-song',
  standalone: true,
  imports: [FontAwesomeModule, PlayerButtonComponent],
  templateUrl: './song.component.html',
  styleUrl: './song.component.scss',
})
export class SongComponent implements OnInit {
  song = input.required<Song>();
  isActive = computed(() => this.playerService.song$()?.id === this.song().id);
  status!: Signal<PlayerStatus>;

  constructor(private playerService: PlayerService) {}

  ngOnInit(): void {
    this.status = computed(() => {
      if (this.isActive()) {
        return this.playerService.status$();
      }
      return PlayerStatus.Paused;
    });
  }

  play() {
    if (this.isActive()) {
      this.playerService.play();
      return;
    }
    this.playerService.setSong(this.song());
    this.playerService.play();
  }

  pause() {
    this.playerService.pause();
  }
}
