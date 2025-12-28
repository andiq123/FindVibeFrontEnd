import { Component, computed, OnInit, Signal, signal, inject } from '@angular/core';
import { OfflineStorageService } from '../../services/offline-storage.service';
import { LibraryService } from '../../services/library.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTrash,
  faDownload,
  faX,
  faCloudArrowDown,
} from '@fortawesome/free-solid-svg-icons';
import { Song } from '../../../../core/models/song.model';

@Component({
  selector: 'app-storage-info',
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: './storage-info.component.html',
  styleUrl: './storage-info.component.scss',
})
export class StorageInfoComponent implements OnInit {
  private offlineStorageService = inject(OfflineStorageService);
  private libraryService = inject(LibraryService);

  hidden = signal<boolean>(false);
  storageTotal!: Signal<number>;
  storageUsed!: Signal<number>;
  loadingDownloading = signal<boolean>(false);
  showRemoveCacheButton = computed(() => {
    return this.offlineStorageService.availableOfflineSongIds().length > 0;
  });

  libraryExists = signal<boolean>(false);
  faTrash = faTrash;
  faDownload = faDownload;
  faX = faX;
  faCloudArrowDown = faCloudArrowDown;

  ngOnInit(): void {
    this.storageTotal = this.offlineStorageService.storageTotal;
    this.storageUsed = this.offlineStorageService.storageUsed;
    this.offlineStorageService.setUpStorage();

    this.populateAvailableOfflineSongs();
  }

  async downloadAll() {
    try {
      this.loadingDownloading.set(true);
      await this.offlineStorageService.cacheAllSongs(this.libraryService.songs());
    } finally {
      this.loadingDownloading.set(false);
    }
  }

  async removeCache() {
    await this.offlineStorageService.removeCache();
    this.offlineStorageService.emptyAvailableOfflineSongIds();
  }

  populateAvailableOfflineSongs() {
    this.libraryService.songs().forEach(async (song: Song) => {
      const isAvailable = await this.offlineStorageService.isAvalaibleOffline(
        song.link
      );
      if (isAvailable) {
        this.offlineStorageService.addAvailableOfflineSongId(song.id);
      }
    });
  }
}
