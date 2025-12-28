import { Injectable, inject, OnDestroy } from '@angular/core';
import { SettingsService } from './settings.service';
import { HapticService } from './haptic.service';

@Injectable({
  providedIn: 'root'
})
export class GestureService implements OnDestroy {
  private readonly settingsService = inject(SettingsService);
  private readonly hapticService = inject(HapticService);

  private lastUpdate = 0;
  private lastX = 0;
  private lastY = 0;
  private lastZ = 0;
  private readonly SHAKE_THRESHOLD = 800; // Sensitivity 
  private lastShakeTime = 0;
  private readonly COOL_DOWN = 1000;

  private boundDeviceMotionHandler = (event: DeviceMotionEvent) => this.handleMotion(event);

  initialize(): void {
    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      // Note: iOS Safari requires explicit permission for DeviceMotion
      // We'll attempt to listen, knowing it might be silent on iOS without a user-triggered permission check
      window.addEventListener('devicemotion', this.boundDeviceMotionHandler, false);
    }
  }

  private handleMotion(event: DeviceMotionEvent): void {
    const acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;

    const curTime = Date.now();
    if ((curTime - this.lastUpdate) > 100) {
      const diffTime = curTime - this.lastUpdate;
      this.lastUpdate = curTime;

      const x = acceleration.x || 0;
      const y = acceleration.y || 0;
      const z = acceleration.z || 0;

      const speed = Math.abs(x + y + z - this.lastX - this.lastY - this.lastZ) / diffTime * 10000;

      if (speed > this.SHAKE_THRESHOLD) {
        if (curTime - this.lastShakeTime > this.COOL_DOWN) {
          this.lastShakeTime = curTime;
          this.onShake();
        }
      }

      this.lastX = x;
      this.lastY = y;
      this.lastZ = z;
    }
  }

  private onShake(): void {
    this.hapticService.medium();
    this.settingsService.toggleShuffle();
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.boundDeviceMotionHandler);
    }
  }
}
