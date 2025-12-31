import {
  Directive,
  ElementRef,
  output,
  inject,
  input,
  NgZone,
  OnInit,
  OnDestroy,
} from "@angular/core";

@Directive({
  selector: "[appSwipeDown]",
  standalone: true,
})
export class SwipeDownDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private ngZone = inject(NgZone);

  handleSelector = input<string>("");
  closePanel = output<void>();

  private startY = 0;
  private currentY = 0;
  private startTime = 0;
  private isSwiping = false;
  private hasHitThreshold = false;
  private isDismissing = false;
  private rafId: number | null = null;

  private boundOnStart = this.onStart.bind(this);
  private boundOnMove = this.onMove.bind(this);
  private boundOnEnd = this.onEnd.bind(this);

  ngOnInit() {
    this.ngZone.runOutsideAngular(() => {
      const el = this.el.nativeElement;
      el.addEventListener("touchstart", this.boundOnStart, { passive: false });
      document.addEventListener("touchmove", this.boundOnMove, {
        passive: false,
      });
      document.addEventListener("touchend", this.boundOnEnd, { passive: true });
      document.addEventListener("touchcancel", this.boundOnEnd, {
        passive: true,
      });
    });
  }

  ngOnDestroy() {
    this.cancelRaf();
    const el = this.el.nativeElement;
    el.removeEventListener("touchstart", this.boundOnStart);
    document.removeEventListener("touchmove", this.boundOnMove);
    document.removeEventListener("touchend", this.boundOnEnd);
    document.removeEventListener("touchcancel", this.boundOnEnd);
  }

  onStart(event: TouchEvent) {
    if (this.isDismissing) return;

    const target = event.target as HTMLElement;
    const selector = this.handleSelector();
    const isGrabBar = !!target.closest(".pressable-native");

    // Exclude bottom controls area - don't allow swipe down from there
    const isControlsArea = !!target.closest(
      '.ios-slider-container, button, input, a, [role="button"], .flex.items-center.justify-between.pt-2',
    );

    if (selector) {
      const allowedElement = target.closest(selector);
      if (!allowedElement) return;

      // Even within allowed selector, block if it's controls area
      if (isControlsArea && !isGrabBar) return;
    } else {
      if (isControlsArea && !isGrabBar) return;
    }

    this.startY = event.touches[0].clientY;
    this.startTime = performance.now();
    this.isSwiping = true;
    this.currentY = 0;
    this.hasHitThreshold = false;
    this.cancelRaf();

    const style = this.el.nativeElement.style;
    style.setProperty("animation", "none", "important");
    style.setProperty("transition", "none", "important");
  }

  onMove(event: TouchEvent) {
    if (!this.isSwiping || this.isDismissing) return;

    if (event.cancelable) event.preventDefault();

    let deltaY = event.touches[0].clientY - this.startY;

    if (deltaY < 0) {
      deltaY = this.calculateRubberBand(deltaY);
    }

    this.currentY = deltaY;

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(this.updatePosition.bind(this));
    }
  }

  private updatePosition() {
    this.rafId = null;
    this.el.nativeElement.style.transform = `translate3d(0, ${this.currentY}px, 0)`;

    const threshold = window.innerHeight * 0.15;
    if (this.currentY > threshold && !this.hasHitThreshold) {
      this.hasHitThreshold = true;
    } else if (this.currentY <= threshold && this.hasHitThreshold) {
      this.hasHitThreshold = false;
    }
  }

  onEnd() {
    this.cancelRaf();
    this.ngZone.run(() => {
      if (!this.isSwiping || this.isDismissing) return;
      this.isSwiping = false;

      const duration = performance.now() - this.startTime;
      const velocity = duration > 0 ? this.currentY / duration : 0;
      const threshold = window.innerHeight * 0.2;
      const velocityThreshold = 0.6;

      if (
        this.currentY > threshold ||
        (velocity > velocityThreshold && this.currentY > 50)
      ) {
        this.performDismiss(velocity);
      } else {
        this.performSnapBack();
      }
    });
  }

  private performDismiss(velocity: number) {
    this.isDismissing = true;
    const el = this.el.nativeElement;

    const baseDuration = 400;
    let duration = baseDuration;

    if (velocity > 1) {
      duration = Math.max(250, baseDuration - velocity * 50);
    }

    const durationSec = duration / 1000;

    el.style.setProperty(
      "transition",
      `transform ${durationSec}s cubic-bezier(0.32, 0.72, 0, 1)`,
      "important",
    );
    el.style.transform = "translate3d(0, 100%, 0)";

    setTimeout(() => {
      this.ngZone.run(() => {
        this.closePanel.emit();
        this.isDismissing = false;
      });
    }, duration);
  }

  private performSnapBack() {
    const el = this.el.nativeElement;
    el.style.setProperty(
      "transition",
      "transform 0.4s cubic-bezier(0.17, 0.89, 0.24, 1.1)",
      "important",
    );
    el.style.transform = "translate3d(0, 0, 0)";

    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName !== "transform") return;
      el.removeEventListener("transitionend", onTransitionEnd);
      if (!this.isSwiping && !this.isDismissing) {
        el.style.removeProperty("animation");
        el.style.removeProperty("transition");
        el.style.removeProperty("transform");
      }
    };
    el.addEventListener("transitionend", onTransitionEnd);
    this.currentY = 0;
    this.hasHitThreshold = false;
  }

  private calculateRubberBand(offset: number): number {
    const dimension = window.innerHeight;
    const constant = 0.55;
    return (
      (1.0 - 1.0 / ((Math.abs(offset) * constant) / dimension + 1.0)) *
      dimension *
      -1
    );
  }

  private cancelRaf() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
