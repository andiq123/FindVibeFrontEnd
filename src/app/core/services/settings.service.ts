import { Injectable, signal, inject, computed } from "@angular/core";
import { StorageService } from "./storage.service";
import { RepeatMode } from "../../features/player/models/player.model";

enum ServerStatus {
  Unchecked = "unchecked",
  Up = "up",
  Down = "down",
}

@Injectable({
  providedIn: "root",
})
export class SettingsService {
  private readonly storageService = inject(StorageService);

  private readonly _repeatMode = signal<RepeatMode>(RepeatMode.OFF);
  private readonly _isShuffle = signal(false);
  private readonly _isMiniPlayer = signal(true);
  private readonly _serverStatus = signal(ServerStatus.Unchecked);
  private readonly _isNavigatorOffline = signal(!navigator.onLine);
  private serverStatusChangeTime = 0;

  readonly repeatMode = this._repeatMode.asReadonly();
  readonly isShuffle = this._isShuffle.asReadonly();
  readonly isMiniPlayer = this._isMiniPlayer.asReadonly();
  readonly isServerDown = computed(
    () => this._serverStatus() === ServerStatus.Down,
  );
  readonly isCheckedServer = computed(
    () => this._serverStatus() !== ServerStatus.Unchecked,
  );
  readonly isOffline = computed(
    () => this._isNavigatorOffline() || this.isServerDown(),
  );

  initialize(): void {
    window.addEventListener("online", () =>
      this._isNavigatorOffline.set(false),
    );
    window.addEventListener("offline", () =>
      this._isNavigatorOffline.set(true),
    );

    const repeatMode = this.storageService.getItem<RepeatMode>("repeatMode");
    const isShuffle = this.storageService.getItem<boolean>("isShuffle");

    if (repeatMode !== null) this._repeatMode.set(repeatMode);
    if (isShuffle !== null) this._isShuffle.set(isShuffle);
  }

  toggleMiniPlayer(): void {
    this._isMiniPlayer.set(!this._isMiniPlayer());
  }

  toggleRepeat(): void {
    const modes = [RepeatMode.OFF, RepeatMode.ALL, RepeatMode.ONE];
    const currentIndex = modes.indexOf(this._repeatMode());
    const nextMode = modes[(currentIndex + 1) % modes.length];

    this._repeatMode.set(nextMode);
    this.storageService.setItem("repeatMode", nextMode);
  }

  toggleShuffle(): void {
    const newValue = !this._isShuffle();
    this._isShuffle.set(newValue);
    this.storageService.setItem("isShuffle", newValue);
  }

  setServerUp(): void {
    const now = Date.now();
    const minDisplayTime = 600; // Minimum 600ms to show loading state
    const elapsed = now - this.serverStatusChangeTime;
    const remainingTime = Math.max(0, minDisplayTime - elapsed);
    
    if (remainingTime > 0) {
      setTimeout(() => {
        this._serverStatus.set(ServerStatus.Up);
      }, remainingTime);
    } else {
      this._serverStatus.set(ServerStatus.Up);
    }
  }

  setServerDown(): void {
    const now = Date.now();
    const minDisplayTime = 600; // Minimum 600ms to show loading state
    const elapsed = now - this.serverStatusChangeTime;
    const remainingTime = Math.max(0, minDisplayTime - elapsed);
    
    if (remainingTime > 0) {
      setTimeout(() => {
        this._serverStatus.set(ServerStatus.Down);
      }, remainingTime);
    } else {
      this._serverStatus.set(ServerStatus.Down);
    }
  }

  setIsCheckedServerPending(): void {
    this.serverStatusChangeTime = Date.now();
    this._serverStatus.set(ServerStatus.Unchecked);
  }
}
