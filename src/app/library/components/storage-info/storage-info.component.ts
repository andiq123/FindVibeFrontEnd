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
    this.checkIfLibraryExists();
  }

  async downloadAll() {
    this.loadingDownloading.set(true);

    await this.storageService.cacheAllSongs(this.libraryService.songs$());
    await this.checkIfLibraryExists();

    this.loadingDownloading.set(false);
  }

  async removeCache() {
    await this.storageService.removeCache();
    await this.checkIfLibraryExists();
    this.libraryService.songs$().forEach((song) => (song.downloaded = false));
  }

  private async checkIfLibraryExists() {
    const exists = await caches.has('library');
    this.libraryExists.set(exists);
  }
}
