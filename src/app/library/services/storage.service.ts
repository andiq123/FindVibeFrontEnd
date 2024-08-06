import { Injectable, signal } from '@angular/core';
import { convertKbToGb, convertKbToMb, convertMbToGb } from '../../utils/utils';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  storageTotal = signal<number>(0);
  storageUsed = signal<number>(0);
  constructor() {}

  setUpStorage() {
    navigator.storage.estimate().then((data) => {
      this.storageTotal.set(convertKbToGb(data.quota!));
      this.storageUsed.set(convertKbToGb(data.usage!));
    });
  }
}
