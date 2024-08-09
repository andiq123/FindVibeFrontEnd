import { Component, computed, input } from '@angular/core';
import { Song } from '../models/song.model';
import { PlayerService } from '../../components/player-wrapper/player.service';
import { PlayerStatus } from '../../components/player-wrapper/models/player.model';
import { PlayerButtonComponent } from '../../shared/player-button/player-button.component';
import { MovingTitleComponent } from '../../shared/moving-title/moving-title.component';
import { AsyncPipe, NgOptimizedImage } from '@angular/common';
import { FavoriteButtonComponent } from '../../shared/favorite-button/favorite-button.component';
import { faCheck, faCloudArrowDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { StorageService } from '../../library/services/storage.service';

@Component({
  selector: 'app-song',
  standalone: true,
  imports: [
    PlayerButtonComponent,
    MovingTitleComponent,
    NgOptimizedImage,
    FavoriteButtonComponent,
    FontAwesomeModule,
  ],
  templateUrl: './song.component.html',
  styleUrl: './song.component.scss',
})
export class SongComponent {
  song = input.required<Song>();
  status = computed(() => {
    if (this.isActive()) {
      return this.playerService.status$();
    }
    return PlayerStatus.Paused;
  });
  isActive = computed(
    () => this.playerService.song$()?.link === this.song().link
  );
  isFavoritePage = input<boolean>(false);

  isDownloadingOffline = computed(() => {
    return this.storageService
      .currentLoadingDownloadSongIds$()
      .includes(this.song().id);
  });

  isAvaiableOffline = computed(() => {
    return (
      this.isFavoritePage() &&
      this.storageService.availableOfflineSongIds$().includes(this.song().id)
    );
  });

  faCloudArrowDown = faCloudArrowDown;

  constructor(
    private playerService: PlayerService,
    private storageService: StorageService
  ) {}

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

  async playOrPause() {
    if (this.status() === PlayerStatus.Paused) {
      await this.play();
    } else {
      this.pause();
    }
  }
}
