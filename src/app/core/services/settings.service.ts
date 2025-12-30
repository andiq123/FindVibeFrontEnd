import { Injectable, signal, inject, computed } from '@angular/core';
import { StorageService } from './storage.service';

enum ServerStatus {
  Unchecked = 'unchecked',
  Up = 'up',
  Down = 'down'
}

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly storageService = inject(StorageService);

  private readonly _isRepeat = signal(false);
  private readonly _isShuffle = signal(false);
  private readonly _isMiniPlayer = signal(true);
  private readonly _serverStatus = signal(ServerStatus.Unchecked);
  private readonly _isNavigatorOffline = signal(!navigator.onLine);

  readonly isRepeat = this._isRepeat.asReadonly();
  readonly isShuffle = this._isShuffle.asReadonly();
  readonly isMiniPlayer = this._isMiniPlayer.asReadonly();
  readonly isServerDown = computed(() => this._serverStatus() === ServerStatus.Down);
  readonly isCheckedServer = computed(() => this._serverStatus() !== ServerStatus.Unchecked);
  readonly isOffline = computed(() => this._isNavigatorOffline() || this.isServerDown());

  initialize(): void {
    window.addEventListener('online', () => this._isNavigatorOffline.set(false));
    window.addEventListener('offline', () => this._isNavigatorOffline.set(true));

    const isRepeat = this.storageService.getItem<boolean>('isRepeat');
    const isShuffle = this.storageService.getItem<boolean>('isShuffle');

    if (isRepeat !== null) this._isRepeat.set(isRepeat);
    if (isShuffle !== null) this._isShuffle.set(isShuffle);
  }

  toggleMiniPlayer(): void {
    this._isMiniPlayer.set(!this._isMiniPlayer());
  }

  toggleRepeat(): void {
    this.toggleMutuallyExclusive(this._isRepeat, this._isShuffle, 'isRepeat', 'isShuffle');
  }

  toggleShuffle(): void {
    this.toggleMutuallyExclusive(this._isShuffle, this._isRepeat, 'isShuffle', 'isRepeat');
  }

  private toggleMutuallyExclusive(
    primary: typeof this._isRepeat,
    secondary: typeof this._isShuffle,
    primaryKey: string,
    secondaryKey: string
  ): void {
    const newValue = !primary();
    primary.set(newValue);
    this.storageService.setItem(primaryKey, newValue);

    if (secondary()) {
      secondary.set(false);
      this.storageService.setItem(secondaryKey, false);
    }
  }

  setServerUp(): void {
    this._serverStatus.set(ServerStatus.Up);
  }

  setServerDown(): void {
    this._serverStatus.set(ServerStatus.Down);
  }

  setIsCheckedServerPending(): void {
    this._serverStatus.set(ServerStatus.Unchecked);
  }
}
