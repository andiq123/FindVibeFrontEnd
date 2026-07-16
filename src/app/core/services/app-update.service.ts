import { Injectable, inject, signal, effect } from "@angular/core";
import { SwUpdate, VersionReadyEvent } from "@angular/service-worker";
import {
  filter,
  interval,
  map,
  switchMap,
  takeWhile,
  tap,
  Subscription,
} from "rxjs";
import { PlayerService } from "./player.service";
import { PlayerStatus } from "../../features/player/models/player.model";

const UPDATE_COUNTDOWN_SECONDS = 3;

@Injectable({
  providedIn: "root",
})
export class AppUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly player = inject(PlayerService);
  readonly newUpdateAvailable = signal(false);
  readonly secondsToUpdate = signal(UPDATE_COUNTDOWN_SECONDS);
  readonly updateLoading = signal(false);
  private checkIntervalSubscription: Subscription | null = null;
  private versionUpdatesSubscription: Subscription | null = null;
  /** Reload deferred until playback stops — don't kill background audio. */
  private pendingApply = false;

  constructor() {
    effect((onCleanup) => {
      if (!this.swUpdate.isEnabled) return;
      if (this.checkIntervalSubscription) {
        this.checkIntervalSubscription.unsubscribe();
        this.checkIntervalSubscription = null;
      }
      if (this.versionUpdatesSubscription) {
        this.versionUpdatesSubscription.unsubscribe();
        this.versionUpdatesSubscription = null;
      }
      this.checkForUpdate();
      this.checkIntervalSubscription = interval(6 * 60 * 60 * 1000)
        .pipe(tap(() => this.checkForUpdate()))
        .subscribe();
      this.versionUpdatesSubscription = this.swUpdate.versionUpdates
        .pipe(
          filter(
            (evt): evt is VersionReadyEvent => evt.type === "VERSION_READY",
          ),
          tap(() => this.newUpdateAvailable.set(true)),
          switchMap(() => this.countdown(UPDATE_COUNTDOWN_SECONDS)),
          tap((time) => {
            this.secondsToUpdate.set(time);
            if (time === 0) void this.applyUpdateWhenIdle();
          }),
        )
        .subscribe();
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

    // If we deferred for playback, apply once the queue is idle.
    effect(() => {
      if (!this.pendingApply) return;
      const status = this.player.status();
      if (
        status === PlayerStatus.Playing ||
        status === PlayerStatus.Loading ||
        status === PlayerStatus.Ended
      ) {
        return;
      }
      this.pendingApply = false;
      void this.applyUpdate();
    });
  }

  private checkForUpdate(): void {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.checkForUpdate();
    }
  }

  private async applyUpdateWhenIdle(): Promise<void> {
    const status = this.player.status();
    if (
      status === PlayerStatus.Playing ||
      status === PlayerStatus.Loading ||
      status === PlayerStatus.Ended
    ) {
      this.pendingApply = true;
      return;
    }
    await this.applyUpdate();
  }

  async applyUpdate(): Promise<void> {
    this.updateLoading.set(true);
    try {
      // Activate waiting SW first — bare reload can keep the old worker.
      if (this.swUpdate.isEnabled) await this.swUpdate.activateUpdate();
    } finally {
      document.location.reload();
    }
  }

  private countdown(startTimer: number) {
    return interval(1000).pipe(
      map((i) => startTimer - i),
      takeWhile((val) => val >= 0),
    );
  }
}
