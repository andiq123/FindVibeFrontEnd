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

  constructor(
    private storageService: StorageService,
    private libraryService: LibraryService
  ) {}

  ngOnInit(): void {
    this.storageTotal = this.storageService.storageTotal;
    this.storageUsed = this.storageService.storageUsed;
    this.storageService.setUpStorage();
  }

  downloadAll() {
    this.libraryService.cacheAllSongs();
  }
}
