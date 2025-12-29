import { Injectable, inject, signal, effect } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval, map, switchMap, takeWhile, tap } from 'rxjs';

const UPDATE_COUNTDOWN_SECONDS = 3;

@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);

  readonly newUpdateAvailable = signal(false);
  readonly secondsToUpdate = signal(UPDATE_COUNTDOWN_SECONDS);
  readonly updateLoading = signal(false);

  constructor() {
    effect(() => {
      if (!this.swUpdate.isEnabled) return;

      this.checkForUpdate();
      interval(6 * 60 * 60 * 1000).pipe(
        tap(() => this.checkForUpdate())
      ).subscribe();

      this.swUpdate.versionUpdates.pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        tap(() => this.newUpdateAvailable.set(true)),
        switchMap(() => this.countdown(UPDATE_COUNTDOWN_SECONDS)),
        tap((time) => {
          this.secondsToUpdate.set(time);
          if (time === 0) {
            this.applyUpdate();
          }
        })
      ).subscribe();
    });
  }

  private checkForUpdate(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.checkForUpdate();
    }
  }

  applyUpdate(): void {
    this.updateLoading.set(true);
    document.location.reload();
  }

  private countdown(startTimer: number) {
    return interval(1000).pipe(
      map(i => startTimer - i),
      takeWhile(val => val >= 0)
    );
  }
}
