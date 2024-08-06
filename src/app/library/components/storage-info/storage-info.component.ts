import { Component, computed, OnInit, Signal, signal } from '@angular/core';
import { StorageService } from '../../services/storage.service';
import { LibraryService } from '../../services/library.service';

@Component({
  selector: 'app-storage-info',
  standalone: true,
  imports: [],
  templateUrl: './storage-info.component.html',
  styleUrl: './storage-info.component.scss',
})
export class StorageInfoComponent implements OnInit {
  storageTotal!: Signal<number>;
  storageUsed!: Signal<number>;
  loadingDownloading = signal<boolean>(false);

  libraryExists = signal<boolean>(false);

  constructor(private storageService: StorageService) {}

  ngOnInit(): void {
    this.storageTotal = this.storageService.storageTotal;
    this.storageUsed = this.storageService.storageUsed;
    this.storageService.setUpStorage();
    this.checkIfLibraryExists();
  }

  async downloadAll() {
    this.loadingDownloading.set(true);
    await this.storageService.cacheAllSongs();
    await this.checkIfLibraryExists();
    this.storageService.setUpStorage();
    this.loadingDownloading.set(false);
  }

  async removeCache() {
    await this.storageService.removeCache();
    this.storageService.setUpStorage();
    await this.checkIfLibraryExists();
  }

  private async checkIfLibraryExists() {
    const exists = await caches.has('library');
    this.libraryExists.set(exists);
  }
}
