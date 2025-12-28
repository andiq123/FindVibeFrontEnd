import { Component, computed, input, output, inject, signal } from '@angular/core';
import { Song } from '../../core/models/song.model';
import { PlayerStatus } from '../../features/player/models/player.model';
import { PlayerButtonComponent } from '../player-button/player-button.component';
import { MovingTitleComponent } from '../moving-title/moving-title.component';
import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { FavoriteButtonComponent } from '../favorite-button/favorite-button.component';
import { faCloudArrowDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { OfflineStorageService } from '../../features/library/services/offline-storage.service';
import { DragAndDropDirective } from '../../features/search/directives/drag-and-drop.directive';
import { PlayerService } from '../../core/services/player.service';

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

  // Inputs
  song = input.required<Song>();
  allowReorder = input<boolean>(false);
  loading = input<boolean>(false);
  compact = input<boolean>(false);
  showOfflineIndicator = input<boolean>(true);
  isFavoritePage = input<boolean>(false);
  
  // Outputs
  reorder = output<{ from: string; to: string }>();
  playlistChange = output<void>();
  
  // Image loading state
  imageLoading = signal(true);
  imageError = signal(false);
  
  // Computed properties
  isActive = computed(() => this.playerService.song()?.link === this.song().link);
  
  status = computed(() => {
    if (this.isActive()) {
      return this.playerService.status();
    }
    return PlayerStatus.Paused;
  });
  
  isDownloadingOffline = computed(() => {
    return this.offlineStorageService
      .currentLoadingDownloadSongIds()
      .includes(this.song().id);
  });
  
  isAvailableOffline = computed(() => {
    return (
      this.isFavoritePage() &&
      this.offlineStorageService.availableOfflineSongIds().includes(this.song().id)
    );
  });

  faCloudArrowDown = faCloudArrowDown;

  async play() {
    if (this.isActive()) {
      await this.playerService.play();
      return;
    }
    this.playlistChange.emit();
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

  emitReorder(data: { from: string; to: string }) {
    this.reorder.emit(data);
  }

  onImageLoad() {
    this.imageLoading.set(false);
    this.imageError.set(false);
  }

  onImageError() {
    this.imageLoading.set(false);
    this.imageError.set(true);
  }
}
