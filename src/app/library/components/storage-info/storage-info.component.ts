import { Component, computed, OnInit, Signal, signal } from '@angular/core';
import { StorageService } from '../../services/storage.service';
import { LibraryService } from '../../services/library.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-storage-info',
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: './storage-info.component.html',
  styleUrl: './storage-info.component.scss',
})
export class StorageInfoComponent implements OnInit {
  storageTotal!: Signal<number>;
  storageUsed!: Signal<number>;
  loadingDownloading = signal<boolean>(false);
  showRemoveCacheButton = computed(() => {
    return this.storageService.availableOfflineSongIds$().length > 0;
  });

  libraryExists = signal<boolean>(false);
  faTrash = faTrash;

  constructor(
    private storageService: StorageService,
    private libraryService: LibraryService
  ) {}

  ngOnInit(): void {
    this.storageTotal = this.storageService.storageTotal;
    this.storageUsed = this.storageService.storageUsed;
    this.storageService.setUpStorage();

    this.populateAvailableOfflineSongs();
  }

  async downloadAll() {
    this.loadingDownloading.set(true);
    await this.storageService.cacheAllSongs(this.libraryService.songs$());
    this.loadingDownloading.set(false);
  }

  async removeCache() {
    await this.storageService.removeCache();
    this.storageService.emptyAvailableOfflineSongIds();
  }

  populateAvailableOfflineSongs() {
    this.libraryService.songs$().forEach(async (song) => {
      if (await this.storageService.isAvalaibleOffline(song.link)) {
        this.storageService.availableOfflineSongIds$.update((prev) => [
          ...prev,
          song.id,
        ]);
      }
    });
  }
}
