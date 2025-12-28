import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval, map, takeWhile, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private swUpdate = inject(SwUpdate);
  
  newUpdateAvailable = signal(false);
  secondsToUpdate = signal(3);

  constructor() {
    if (this.swUpdate.isEnabled) {
      this.checkForUpdate().subscribe();
    }
  }

  private checkForUpdate() {
    return this.swUpdate.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
      tap(() => {
        this.newUpdateAvailable.set(true);
        this.countdown(3).subscribe((time) => {
          this.secondsToUpdate.set(time);
          if (time === 0) {
            document.location.reload();
          }
        });
      })
    );
  }

  private countdown(startTimer: number) {
    return interval(1000).pipe(
      map(i => startTimer - i),
      takeWhile(val => val >= 0)
    );
  }
}
