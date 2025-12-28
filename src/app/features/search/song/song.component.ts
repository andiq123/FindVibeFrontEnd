import { Component, computed, input, output, inject } from '@angular/core';
import { Song } from '../../../core/models/song.model';
import { PlayerStatus } from '../../player/models/player.model';
import { PlayerButtonComponent } from '../../../shared/player-button/player-button.component';
import { MovingTitleComponent } from '../../../shared/moving-title/moving-title.component';
import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { FavoriteButtonComponent } from '../../../shared/favorite-button/favorite-button.component';
import { faCloudArrowDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { OfflineStorageService } from '../../library/services/offline-storage.service';
import { DragAndDropDirective } from '../directives/drag-and-drop.directive';
import { PlayerService } from '../../../core/services/player.service';

@Component({
    selector: 'app-song',
    imports: [
        PlayerButtonComponent,
        MovingTitleComponent,
        NgOptimizedImage,
        FavoriteButtonComponent,
        FontAwesomeModule,
        DragAndDropDirective,
        NgTemplateOutlet,
    ],
    templateUrl: './song.component.html',
    styleUrl: './song.component.scss'
})
export class SongComponent {
  private playerService = inject(PlayerService);
  private offlineStorageService = inject(OfflineStorageService);

  allowReorder = input<boolean>(false);
  onReorderSongs = output<{ from: string; to: string }>();
  width = input<number>(56);
  offset = input<number>(26);
  song = input.required<Song>();
  
  isActive = computed(() => this.playerService.song()?.link === this.song().link);
  
  status = computed(() => {
    if (this.isActive()) {
      return this.playerService.status();
    }
    return PlayerStatus.Paused;
  });
  
  isFavoritePage = input<boolean>(false);
  
  isDownloadingOffline = computed(() => {
    return this.offlineStorageService
      .currentLoadingDownloadSongIds()
      .includes(this.song().id);
  });
  
  isAvaiableOffline = computed(() => {
    return (
      this.isFavoritePage() &&
      this.offlineStorageService.availableOfflineSongIds().includes(this.song().id)
    );
  });
  
  onChangePlaylist = output();

  faCloudArrowDown = faCloudArrowDown;

  async play() {
    if (this.isActive()) {
      await this.playerService.play();
      return;
    }
    this.onChangePlaylist.emit();

    await this.playerService.setSong(this.song());
  }

  async pause() {
    this.playerService.pause();
  }

  async playOrPause() {
    if (this.status() === PlayerStatus.Paused) {
      await this.play();
    } else {
      await this.pause();
    }
  }

  reorder(data: { from: string; to: string }) {
    this.onReorderSongs.emit(data);
  }
}
