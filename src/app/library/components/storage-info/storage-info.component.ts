import { Component, computed, OnInit, Signal, signal } from '@angular/core';
import { StorageService } from '../../services/storage.service';

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
  progress = computed(() => {
    return this.storageUsed() / this.storageTotal();
  });

  constructor(private storageService: StorageService) {}

  ngOnInit(): void {
    this.storageTotal = this.storageService.storageTotal;
    this.storageUsed = this.storageService.storageUsed;
    (async () => {
      if (navigator.storage && (await navigator.storage.persist())) {
        const isPersisted = await navigator.storage.persisted();
        console.log(`Persisted storage granted: ${isPersisted}`);
      }
    })();
  }
}
