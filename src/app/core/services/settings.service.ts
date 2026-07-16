import { Injectable, signal, inject, computed, OnDestroy } from "@angular/core";
import { StorageService } from "./storage.service";
import { RepeatMode } from "../../features/player/models/player.model";
import { HttpClient } from "@angular/common/http";
import {
  Observable,
  catchError,
  defer,
  retry,
  switchMap,
  tap,
  timer,
  timeout,
} from "rxjs";
import { environment } from "../../../environments/environment";

enum ServerStatus {
  Unchecked = "unchecked",
  Up = "up",
  Down = "down",
}

@Injectable({
  providedIn: "root",
})
export class SettingsService implements OnDestroy {
  private readonly storageService = inject(StorageService);
  private readonly httpClient = inject(HttpClient);
  private readonly healthUrl = `${environment.API_URL}/health`;
  private readonly _repeatMode = signal<RepeatMode>(RepeatMode.OFF);
  private readonly _isShuffle = signal(false);
  private readonly _isMiniPlayer = signal(true);
  private readonly _serverStatus = signal(ServerStatus.Unchecked);
  private readonly _isNavigatorOffline = signal(!navigator.onLine);
  private onlineHandler = () => this._isNavigatorOffline.set(false);
  private offlineHandler = () => this._isNavigatorOffline.set(true);
  readonly repeatMode = this._repeatMode.asReadonly();
  readonly isShuffle = this._isShuffle.asReadonly();
  readonly isMiniPlayer = this._isMiniPlayer.asReadonly();
  readonly isServerDown = computed(
    () => this._serverStatus() === ServerStatus.Down,
  );
  readonly isCheckedServer = computed(
    () => this._serverStatus() !== ServerStatus.Unchecked,
  );
  /** True when the device has no network (CDN streaming / offline vault gate). */
  readonly isNavigatorOffline = this._isNavigatorOffline.asReadonly();
  /** API unreachable or device offline — gates search / server-backed flows. */
  readonly isOffline = computed(
    () => this._isNavigatorOffline() || this.isServerDown(),
  );

  initialize(): void {
    window.addEventListener("online", this.onlineHandler);
    window.addEventListener("offline", this.offlineHandler);
    const repeatMode = this.storageService.getItem<RepeatMode>("repeatMode");
    const isShuffle = this.storageService.getItem<boolean>("isShuffle");
    if (repeatMode !== null) this._repeatMode.set(repeatMode);
    if (isShuffle !== null) this._isShuffle.set(isShuffle);
  }

  ngOnDestroy(): void {
    window.removeEventListener("online", this.onlineHandler);
    window.removeEventListener("offline", this.offlineHandler);
  }

  toggleMiniPlayer(): void {
    this._isMiniPlayer.set(!this._isMiniPlayer());
  }

  toggleRepeat(): void {
    const modes = [RepeatMode.OFF, RepeatMode.ALL, RepeatMode.ONE];
    const i = modes.indexOf(this._repeatMode());
    const nextMode = modes[((i < 0 ? 0 : i) + 1) % modes.length];
    this._repeatMode.set(nextMode);
    this.storageService.setItem("repeatMode", nextMode);
  }

  toggleShuffle(): void {
    const newValue = !this._isShuffle();
    this._isShuffle.set(newValue);
    this.storageService.setItem("isShuffle", newValue);
  }

  setServerUp(): void {
    this._serverStatus.set(ServerStatus.Up);
  }

  setServerDown(): void {
    this._serverStatus.set(ServerStatus.Down);
  }

  wakeServer(): Observable<void> {
    return this.httpClient.get<void>(this.healthUrl);
  }

  /**
   * Probe /health until Render answers. Starts Unchecked → banner "Waking…".
   * On failure stays Down (no flash back to Unchecked). Recurses every 20s.
   */
  wakeUntilUp(): Observable<void> {
    return defer(() =>
      this.wakeServer().pipe(
        timeout({ first: 12_000 }),
        retry({
          count: 12,
          delay: (_err, n) => timer(Math.min(2000 * n, 12_000)),
        }),
        tap(() => this.setServerUp()),
      ),
    ).pipe(
      catchError(() => {
        this.setServerDown();
        // ponytail: free Render sleeps — keep poking every 20s
        return timer(20_000).pipe(switchMap(() => this.wakeUntilUp()));
      }),
    );
  }
}
