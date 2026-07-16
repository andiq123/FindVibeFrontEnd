import { Injectable, signal } from "@angular/core";

/** Tiny app-wide flash toast (skip feedback, queue confirms). */
@Injectable({ providedIn: "root" })
export class ToastService {
  readonly message = signal("");
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(msg: string, ms = 2400): void {
    if (!msg) return;
    if (this.timer != null) clearTimeout(this.timer);
    this.message.set(msg);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.message.set("");
    }, ms);
  }

  clear(): void {
    if (this.timer != null) clearTimeout(this.timer);
    this.timer = null;
    this.message.set("");
  }
}
