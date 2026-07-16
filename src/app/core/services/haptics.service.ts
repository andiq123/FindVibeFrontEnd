import { Injectable, OnDestroy } from "@angular/core";
import { WebHaptics } from "web-haptics";

/**
 * Thin web-haptics wrapper.
 * Presets (keep soft — music UI, not a game):
 *   selection → nav / toggles
 *   light     → play, next, prev
 *   soft      → async content ready (lyrics, search, explore)
 *   success   → favorite, radio queued, reorder saved, download
 *   warning   → user-visible play failure (not auto-skip)
 * Never: buzz / heavy / error-triple on routine taps.
 */
@Injectable({ providedIn: "root" })
export class HapticsService implements OnDestroy {
  private readonly haptics = new WebHaptics({
    debug: false,
    showSwitch: false,
  });
  private lastWarnKey = "";

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

  private fire(preset: string, intensity?: number): void {
    if (!this.canFire()) return;
    void this.haptics.trigger(preset, intensity != null ? { intensity } : undefined);
  }

  private canFire(): boolean {
    if (!WebHaptics.isSupported) return false;
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
