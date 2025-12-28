import { Injectable, signal, inject } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private _isRepeat = signal<boolean>(false);
  private _isShuffle = signal<boolean>(false);
  private _isMiniPlayer = signal<boolean>(true);
  private _isServerDown = signal<boolean>(false);
  private _isCheckedServer = signal<boolean>(false);
  isRepeat = this._isRepeat.asReadonly();
  isShuffle = this._isShuffle.asReadonly();
  isMiniPlayer = this._isMiniPlayer.asReadonly();
  isServerDown = this._isServerDown.asReadonly();
  isCheckedServer = this._isCheckedServer.asReadonly();

  private storageService = inject(StorageService);

  constructor() {
    this.setIsRepeatAndShuffle();
  }

  toggleMiniPlayer() {
    this._isMiniPlayer.set(!this._isMiniPlayer());
  }

  toggleRepeat() {
    this._isRepeat.set(!this._isRepeat());
    this.storageService.setItem('isRepeat', this._isRepeat());

    if (this._isShuffle()) {
      this._isShuffle.set(!this._isShuffle());
      this.storageService.setItem('isShuffle', this._isShuffle());
    }
  }

  toggleShuffle() {
    this._isShuffle.set(!this._isShuffle());
    this.storageService.setItem('isShuffle', this._isShuffle());

    if (this._isRepeat()) {
      this._isRepeat.set(!this._isRepeat());
      this.storageService.setItem('isRepeat', this._isRepeat());
    }
  }

  private setIsRepeatAndShuffle() {
    const isRepeat = this.storageService.getItem<boolean>('isRepeat');
    const isShuffle = this.storageService.getItem<boolean>('isShuffle');

    if (isRepeat !== null) {
      this._isRepeat.set(isRepeat);
    }

    if (isShuffle !== null) {
      this._isShuffle.set(isShuffle);
    }
  }

  setServerUp() {
    this._isServerDown.set(false);
  }

  setServerDown() {
    this._isServerDown.set(true);
  }

  setIsCheckedServerDone() {
    this._isCheckedServer.set(true);
  }

  setIsCheckedServerPending() {
    this._isCheckedServer.set(false);
  }
}
