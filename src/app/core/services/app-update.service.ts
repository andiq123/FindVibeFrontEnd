import { Injectable, inject, signal, effect } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval, map, takeWhile, tap } from 'rxjs';

const UPDATE_COUNTDOWN_SECONDS = 3;

@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);

  readonly newUpdateAvailable = signal(false);
  readonly secondsToUpdate = signal(UPDATE_COUNTDOWN_SECONDS);

  private readonly updateCheck = effect(() => {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
      tap(() => {
        this.newUpdateAvailable.set(true);
        this.countdown(UPDATE_COUNTDOWN_SECONDS).subscribe((time) => {
          this.secondsToUpdate.set(time);
          if (time === 0) {
            document.location.reload();
          }
        });
      })
    ).subscribe();
  });

  private countdown(startTimer: number) {
    return interval(1000).pipe(
      map(i => startTimer - i),
      takeWhile(val => val >= 0)
    );
  }
}
