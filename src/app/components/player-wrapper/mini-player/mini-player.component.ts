import { Component, computed, output } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { PlayerService } from '../player.service';
import { PlayerStatus } from '../models/player.model';
import { PlayerButtonComponent } from '../../../shared/player-button/player-button.component';
import { MovingTitleComponent } from '../../../shared/moving-title/moving-title.component';
import { NgOptimizedImage } from '@angular/common';

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
  song = computed(() => this.playerService.song$());
  status = computed(() => this.playerService.status$());
  onToggleSize = output<void>();

  playerStatus = PlayerStatus;

  faArrowUp = faArrowUp;

  constructor(private playerService: PlayerService) {}

  toggleSize() {
    this.onToggleSize.emit();
  }
}
