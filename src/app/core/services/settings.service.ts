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

  readonly isRepeat = this._isRepeat.asReadonly();
  readonly isShuffle = this._isShuffle.asReadonly();
  readonly isMiniPlayer = this._isMiniPlayer.asReadonly();
  readonly isServerDown = computed(() => this._serverStatus() === ServerStatus.Down);
  readonly isCheckedServer = computed(() => this._serverStatus() !== ServerStatus.Unchecked);

  private readonly loadSettings = void (() => {
    const isRepeat = this.storageService.getItem<boolean>('isRepeat');
    const isShuffle = this.storageService.getItem<boolean>('isShuffle');

    if (isRepeat !== null) this._isRepeat.set(isRepeat);
    if (isShuffle !== null) this._isShuffle.set(isShuffle);
  })();

  toggleMiniPlayer(): void {
    this._isMiniPlayer.set(!this._isMiniPlayer());
  }

  toggleRepeat(): void {
    const newValue = !this._isRepeat();
    this._isRepeat.set(newValue);
    this.storageService.setItem('isRepeat', newValue);

    if (this._isShuffle()) {
      this._isShuffle.set(false);
      this.storageService.setItem('isShuffle', false);
    }
  }

  toggleShuffle(): void {
    const newValue = !this._isShuffle();
    this._isShuffle.set(newValue);
    this.storageService.setItem('isShuffle', newValue);

    if (this._isRepeat()) {
      this._isRepeat.set(false);
      this.storageService.setItem('isRepeat', false);
    }
  }

  setServerUp(): void {
    this._serverStatus.set(ServerStatus.Up);
  }

  setServerDown(): void {
    this._serverStatus.set(ServerStatus.Down);
  }

  setIsCheckedServerDone(): void {
    if (this._serverStatus() === ServerStatus.Unchecked) {
      this._serverStatus.set(ServerStatus.Up);
    }
  }

  setIsCheckedServerPending(): void {
    this._serverStatus.set(ServerStatus.Unchecked);
  }
}
