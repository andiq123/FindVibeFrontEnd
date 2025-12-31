import { Injectable, inject } from "@angular/core";
import { SettingsService } from "./settings.service";

export enum HapticFeedback {
  LIGHT = "light",
  MEDIUM = "medium",
  HEAVY = "heavy",
  SUCCESS = "success",
  WARNING = "warning",
  ERROR = "error",
  SELECTION = "selection",
}

@Injectable({
  providedIn: "root",
})
export class HapticService {
  private settingsService = inject(SettingsService);
  private isSupported: boolean;

  private readonly patterns = {
    [HapticFeedback.LIGHT]: [10],
    [HapticFeedback.MEDIUM]: [15],
    [HapticFeedback.HEAVY]: [25],
    [HapticFeedback.SUCCESS]: [10, 50, 10],
    [HapticFeedback.WARNING]: [15, 50, 15],
    [HapticFeedback.ERROR]: [20, 50, 20, 50, 20],
    [HapticFeedback.SELECTION]: [5],
  };

  constructor() {
    this.isSupported = "vibrate" in navigator;
  }

  impact(type: HapticFeedback = HapticFeedback.LIGHT): void {
    if (!this.isSupported || !this.settingsService.isHapticEnabled()) return;

    const pattern = this.patterns[type];
    if (pattern) {
      navigator.vibrate(pattern);
    }
  }

  custom(pattern: number[]): void {
    if (!this.isSupported || !this.settingsService.isHapticEnabled()) return;
    navigator.vibrate(pattern);
  }

  get supported(): boolean {
    return this.isSupported;
  }
}
