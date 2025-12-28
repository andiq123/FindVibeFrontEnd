import { Component, computed, OnInit, signal, inject, viewChild, ElementRef } from '@angular/core';
import { OfflineStorageService } from '../../services/offline-storage.service';
import { LibraryService } from '../../services/library.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTrash, faCloudArrowDown } from '@fortawesome/free-solid-svg-icons';
import { Song } from '../../../../core/models/song.model';

@Component({
    selector: 'app-storage-info',
    imports: [FontAwesomeModule],
    templateUrl: './storage-info.component.html',
    styleUrl: './storage-info.component.scss'
})
export class StorageInfoComponent implements OnInit {
  private offlineStorageService = inject(OfflineStorageService);
  private libraryService = inject(LibraryService);

  isVisible = signal<boolean>(false);
  isClosing = signal<boolean>(false);

  sheetRef = viewChild<ElementRef<HTMLDivElement>>('sheetRef');

  storageTotal = this.offlineStorageService.storageTotal;
  storageUsed = this.offlineStorageService.storageUsed;
  loadingDownloading = signal<boolean>(false);
  loadingClearing = signal<boolean>(false);

  showRemoveCacheButton = computed(() => {
    return this.offlineStorageService.availableOfflineSongIds().length > 0;
  });

  faTrash = faTrash;
  faCloudArrowDown = faCloudArrowDown;

  ngOnInit(): void {
    this.offlineStorageService.setUpStorage();
    this.populateAvailableOfflineSongs();
  }

  toggle(): void {
    if (this.isVisible()) {
      this.dismiss();
    } else {
      this.isVisible.set(true);
      this.isClosing.set(false);
    }
  }

  dismiss(): void {
    this.isClosing.set(true);
    const element = this.sheetRef()?.nativeElement;
    if (element) {
      element.addEventListener('animationend', () => {
        this.isVisible.set(false);
        this.isClosing.set(false);
      }, { once: true });
    } else {
      this.isVisible.set(false);
      this.isClosing.set(false);
    }
  }

  async downloadAll(): Promise<void> {
    try {
      this.loadingDownloading.set(true);
      await this.offlineStorageService.cacheAllSongs(this.libraryService.songs());
      this.populateAvailableOfflineSongs();
    } catch (error) {
      console.error('[StorageInfo] Failed to download songs:', error);
    } finally {
      this.loadingDownloading.set(false);
    }
  }

  async removeCache(): Promise<void> {
    try {
      this.loadingClearing.set(true);
      await this.offlineStorageService.removeCache();
      this.populateAvailableOfflineSongs();
    } catch (error) {
      console.error('[StorageInfo] Failed to clear cache:', error);
    } finally {
      this.loadingClearing.set(false);
    }
  }

  private async populateAvailableOfflineSongs(): Promise<void> {
    const songs = this.libraryService.songs();
    await Promise.all(
      songs.map(async (song: Song) => {
        const isAvailable = await this.offlineStorageService.isAvailableOffline(song.link);
        if (isAvailable) {
          this.offlineStorageService.addAvailableOfflineSongId(song.id);
        }
      })
    );
  }
}
