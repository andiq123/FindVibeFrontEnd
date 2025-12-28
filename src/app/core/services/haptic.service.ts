import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class HapticService {
  private readonly isSupported = typeof navigator !== 'undefined' && !!navigator.vibrate;

  light(): void {
    this.vibrate(10);
  }

  medium(): void {
    this.vibrate(20);
  }

  success(): void {
    this.vibrate([10, 30, 10]);
  }

  warning(): void {
    this.vibrate([30, 50, 30]);
  }

  private vibrate(pattern: number | number[]): void {
    if (this.isSupported) {
      try {
        navigator.vibrate(pattern);
      } catch {

      }
    }
  }
}
