import { effect, signal, WritableSignal } from "@angular/core";
import { StorageService } from "../services/storage.service";

export function createPersistedSignal<T>(
  storageService: StorageService,
  key: string,
  initialValue: T,
): WritableSignal<T> {
  const storedValue = storageService.getItem<T>(key);
  const sig = signal<T>(storedValue ?? initialValue);

  effect(() => {
    storageService.setItem(key, sig());
  });

  return sig;
}
