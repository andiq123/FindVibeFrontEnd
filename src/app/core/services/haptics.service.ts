import { Injectable, OnDestroy, inject } from "@angular/core";
import { WebHaptics } from "web-haptics";
import { SettingsService } from "./settings.service";

export type HapticPreset =
  | "selection"
  | "light"
  | "soft"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error"
  | "nudge"
  | "buzz";

/**
 * Thin web-haptics wrapper.
 * Presets (keep soft — music UI, not a game):
 *   selection → nav / toggles
 *   light     → play, next, prev
 *   soft      → async content ready (lyrics, search, explore)
 *   success   → favorite, radio queued, reorder saved, download
 *   warning   → user-visible play failure (not auto-skip)
 *
 * Always call trigger() — do NOT gate on WebHaptics.isSupported.
 * Package path: Android → navigator.vibrate; iOS → hidden switch .click()
 * (works iOS 17.4–26.4; Apple patched programmatic click in 26.5+).
 */
@Injectable({ providedIn: "root" })
export class HapticsService implements OnDestroy {
  private readonly settings = inject(SettingsService);
  private readonly haptics = new WebHaptics({
    debug: false,
    showSwitch: false,
  });
  private lastWarnKey = "";

  /** Vibration API only (Android). iOS uses the switch fallback instead. */
  readonly hasVibrateApi = WebHaptics.isSupported;
  readonly isAppleTouch = isAppleTouch();

  /** Softest tick — tab bar, shuffle/repeat, discard. */
  selection(): void {
    this.fire("selection");
  }

  /** Play / pause / next / prev / song row. */
  light(): void {
    this.fire("light");
  }

  /** Loading finished → content (or calm empty) is on screen. */
  ready(): void {
    this.fire("soft", 0.45);
  }

  /** Confirmations that landed. */
  success(): void {
    this.fire("success", 0.55);
  }

  /** One soft warning per failed track (user pick), not per auto-skip. */
  warnOnce(key: string): void {
    if (!key || key === this.lastWarnKey) return;
    this.lastWarnKey = key;
    this.fire("warning", 0.5);
  }

  clearWarn(): void {
    this.lastWarnKey = "";
  }

  /**
   * Settings tester — always fires (bypasses reduced-motion).
   * Desktop (no vibrate): debug click-audio so you hear something.
   * iOS: leave debug off so the switch fallback can tick.
   */
  test(preset: HapticPreset, intensity: number): void {
    if (!this.settings.hapticsEnabled()) return;
    const i = Math.max(0.05, Math.min(1, intensity));
    const desktopAudio = !WebHaptics.isSupported && !isAppleTouch();
    if (desktopAudio) this.haptics.setDebug(true);
    void this.haptics.trigger(preset, { intensity: i }).finally(() => {
      if (desktopAudio) this.haptics.setDebug(false);
    });
  }

  private fire(preset: string, intensity?: number): void {
    if (!this.canFire()) return;
    // Sync call into trigger so iOS switch .click() stays inside the user gesture.
    void this.haptics.trigger(
      preset,
      intensity != null ? { intensity } : undefined,
    );
  }

  private canFire(): boolean {
    if (!this.settings.hapticsEnabled()) return false;
    if (
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return false;
    }
    return true;
  }

  ngOnDestroy(): void {
    this.haptics.destroy();
  }
}

function isAppleTouch(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
