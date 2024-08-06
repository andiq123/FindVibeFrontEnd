import { Component, computed, input, OnInit, Signal } from '@angular/core';
import { Song } from '../models/song.model';
import { PlayerService } from '../../components/player-wrapper/player.service';
import { PlayerStatus } from '../../components/player-wrapper/models/player.model';
import { PlayerButtonComponent } from '../../shared/player-button/player-button.component';
import { MovingTitleComponent } from '../../shared/moving-title/moving-title.component';
import { NgOptimizedImage } from '@angular/common';
import { FavoriteButtonComponent } from '../../shared/favorite-button/favorite-button.component';

@Component({
  selector: 'app-song',
  standalone: true,
  imports: [
    PlayerButtonComponent,
    MovingTitleComponent,
    NgOptimizedImage,
    FavoriteButtonComponent,
  ],
  templateUrl: './song.component.html',
  styleUrl: './song.component.scss',
})
export class SongComponent implements OnInit {
  song = input.required<Song>();
  isActive!: Signal<boolean>;

  status!: Signal<PlayerStatus>;

  constructor(private playerService: PlayerService) {}

  ngOnInit(): void {
    this.isActive = computed(
      () => this.playerService.song$()?.link === this.song().link
    );
    this.status = computed(() => {
      if (this.isActive()) {
        return this.playerService.status$();
      }
      return PlayerStatus.Paused;
    });
  }

  async play() {
    if (this.isActive()) {
      this.playerService.play();
      return;
    }
    await this.playerService.setSong(this.song());
    this.playerService.play();
  }

  pause() {
    this.playerService.pause();
  }
}
