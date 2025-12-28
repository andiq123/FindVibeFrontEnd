import { Component, computed, OnInit, signal, inject, effect, viewChild, ElementRef } from '@angular/core';
import { OfflineStorageService } from '../../services/offline-storage.service';
import { LibraryService } from '../../services/library.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faTrash,
  faCloudArrowDown,
  faArrowDown,
} from '@fortawesome/free-solid-svg-icons';
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
  
  showRemoveCacheButton = computed(() => {
    return this.offlineStorageService.availableOfflineSongIds().length > 0;
  });

  faTrash = faTrash;
  faCloudArrowDown = faCloudArrowDown;
  faArrowDown = faArrowDown;

  ngOnInit(): void {
    this.offlineStorageService.setUpStorage();
    this.populateAvailableOfflineSongs();
  }

  toggle() {
    if (this.isVisible()) {
      this.dismiss();
    } else {
      this.isVisible.set(true);
      this.isClosing.set(false);
    }
  }

  dismiss() {
    this.isClosing.set(true);
    
    // Listen for the slideDown animation completion
    const element = this.sheetRef()?.nativeElement;
    if (element) {
      element.addEventListener('animationend', () => {
        this.isVisible.set(false);
        this.isClosing.set(false);
      }, { once: true });
    } else {
      // Fallback if element is not found
      this.isVisible.set(false);
      this.isClosing.set(false);
    }
  }

  async downloadAll() {
    try {
      this.loadingDownloading.set(true);
      await this.offlineStorageService.cacheAllSongs(this.libraryService.songs());
    } finally {
      this.loadingDownloading.set(false);
      this.isVisible.set(false);
    }
  }

  async removeCache() {
    await this.offlineStorageService.removeCache();
    this.offlineStorageService.emptyAvailableOfflineSongIds();
  }

  private populateAvailableOfflineSongs() {
    this.libraryService.songs().forEach(async (song: Song) => {
      const isAvailable = await this.offlineStorageService.isAvailableOffline(song.link);
      if (isAvailable) {
        this.offlineStorageService.addAvailableOfflineSongId(song.id);
      }
    });
  }
}
