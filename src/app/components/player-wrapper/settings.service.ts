import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private isRepeat = signal<boolean>(false);
  private isShuffle = signal<boolean>(false);
  private isMiniPlayer = signal<boolean>(true);
  isRepeat$ = this.isRepeat.asReadonly();
  isShuffle$ = this.isShuffle.asReadonly();
  isMiniPlayer$ = this.isMiniPlayer.asReadonly();

  constructor() {
    this.setIsRepeatAndShuffle();
  }

  toggleMiniPlayer() {
    this.isMiniPlayer.set(!this.isMiniPlayer());
  }

  toggleRepeat() {
    this.isRepeat.set(!this.isRepeat());
    this.setValueToLocalStorage('isRepeat', this.isRepeat());

    if (this.isShuffle()) {
      this.isShuffle.set(!this.isShuffle());
      this.setValueToLocalStorage('isShuffle', this.isShuffle());
    }
  }

  toggleShuffle() {
    this.isShuffle.set(!this.isShuffle());
    this.setValueToLocalStorage('isShuffle', this.isShuffle());

    if (this.isRepeat()) {
      this.isRepeat.set(!this.isRepeat());
      this.setValueToLocalStorage('isRepeat', this.isRepeat());
    }
  }

  private setValueToLocalStorage(key: string, value: boolean) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  private setIsRepeatAndShuffle() {
    const isRepeat = localStorage.getItem('isRepeat');
    const isShuffle = localStorage.getItem('isShuffle');

    if (isRepeat) {
      this.isRepeat.set(JSON.parse(isRepeat));
    }

    if (isShuffle) {
      this.isShuffle.set(JSON.parse(isShuffle));
    }
  }
}
