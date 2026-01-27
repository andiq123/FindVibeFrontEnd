import { Injectable, inject, signal, effect } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval, map, switchMap, takeWhile, tap, Subscription } from 'rxjs';

const UPDATE_COUNTDOWN_SECONDS = 3;

@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);

  readonly newUpdateAvailable = signal(false);
  readonly secondsToUpdate = signal(UPDATE_COUNTDOWN_SECONDS);
  readonly updateLoading = signal(false);

  private checkIntervalSubscription: Subscription | null = null;
  private versionUpdatesSubscription: Subscription | null = null;

  constructor() {
    effect((onCleanup) => {
      if (!this.swUpdate.isEnabled) return;

      // Cleanup previous subscriptions if they exist
      if (this.checkIntervalSubscription) {
        this.checkIntervalSubscription.unsubscribe();
        this.checkIntervalSubscription = null;
      }
      if (this.versionUpdatesSubscription) {
        this.versionUpdatesSubscription.unsubscribe();
        this.versionUpdatesSubscription = null;
      }

      this.checkForUpdate();
      
      this.checkIntervalSubscription = interval(6 * 60 * 60 * 1000).pipe(
        tap(() => this.checkForUpdate())
      ).subscribe();

      this.versionUpdatesSubscription = this.swUpdate.versionUpdates.pipe(
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

      // Cleanup subscriptions when effect is destroyed
      onCleanup(() => {
        if (this.checkIntervalSubscription) {
          this.checkIntervalSubscription.unsubscribe();
          this.checkIntervalSubscription = null;
        }
        if (this.versionUpdatesSubscription) {
          this.versionUpdatesSubscription.unsubscribe();
          this.versionUpdatesSubscription = null;
        }
      });
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
