import {
  Directive,
  ElementRef,
  output,
  inject,
  input,
  NgZone,
  OnInit,
  OnDestroy
} from '@angular/core';
import { HapticService } from '../../../core/services/haptic.service';

@Directive({
  selector: '[appSwipeDown]',
  standalone: true,
})
export class SwipeDownDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private hapticService = inject(HapticService);
  private ngZone = inject(NgZone);

  handleSelector = input<string>('');
  closePanel = output<void>();

  private startY = 0;
  private currentY = 0;
  private startTime = 0;
  private isSwiping = false;
  private hasHitThreshold = false;
  private isDismissing = false;

  private boundOnStart = this.onStart.bind(this);
  private boundOnMove = this.onMove.bind(this);
  private boundOnEnd = this.onEnd.bind(this);

  ngOnInit() {
    this.ngZone.runOutsideAngular(() => {
      const el = this.el.nativeElement;
      el.addEventListener('touchstart', this.boundOnStart, { passive: false });
      document.addEventListener('touchmove', this.boundOnMove, { passive: false });
      document.addEventListener('touchend', this.boundOnEnd, { passive: true });
      document.addEventListener('touchcancel', this.boundOnEnd, { passive: true });
    });
  }

  ngOnDestroy() {
    const el = this.el.nativeElement;
    el.removeEventListener('touchstart', this.boundOnStart);
    document.removeEventListener('touchmove', this.boundOnMove);
    document.removeEventListener('touchend', this.boundOnEnd);
    document.removeEventListener('touchcancel', this.boundOnEnd);
  }

  onStart(event: TouchEvent) {
    if (this.isDismissing) return;

    const target = event.target as HTMLElement;
    const selector = this.handleSelector();
    const isGrabBar = !!target.closest('.pressable-native');
    const isInteractive = !!target.closest('button, input, a, [role="button"], .ios-slider-container');

    if (selector) {
      if (!target.closest(selector)) return;
    } else {
      if (isInteractive && !isGrabBar) return;
    }

    this.startY = event.touches[0].clientY;
    this.startTime = performance.now();
    this.isSwiping = true;
    this.hasHitThreshold = false;

    const style = this.el.nativeElement.style;
    style.setProperty('animation', 'none', 'important');
    style.setProperty('transition', 'none', 'important');
  }

  onMove(event: TouchEvent) {
    if (!this.isSwiping || this.isDismissing) return;

    const deltaY = event.touches[0].clientY - this.startY;
    this.currentY = deltaY;

    if (event.cancelable) event.preventDefault();
    this.el.nativeElement.style.transform = `translate3d(0, ${this.currentY}px, 0)`;

    const threshold = window.innerHeight * 0.1;
    if (this.currentY > threshold && !this.hasHitThreshold) {
      this.hasHitThreshold = true;
      this.hapticService.light();
    } else if (this.currentY <= threshold && this.hasHitThreshold) {
      this.hasHitThreshold = false;
    }
  }

  onEnd() {
    this.ngZone.run(() => {
      if (!this.isSwiping || this.isDismissing) return;
      this.isSwiping = false;

      const duration = performance.now() - this.startTime;
      const velocity = duration > 0 ? this.currentY / duration : 0;
      const threshold = window.innerHeight * 0.1;
      const velocityThreshold = 0.5;

      if (this.currentY > threshold || (velocity > velocityThreshold && this.currentY > 40)) {
        this.performDismiss(velocity);
      } else {
        this.performSnapBack();
      }
    });
  }

  private performDismiss(velocity: number) {
    this.isDismissing = true;
    const el = this.el.nativeElement;

    const remainingDistance = window.innerHeight - this.currentY;
    const duration = Math.min(0.18, Math.max(0.05, remainingDistance / (Math.abs(velocity) * 2000 + 1200)));

    el.style.setProperty('transition', `transform ${duration}s cubic-bezier(0.33, 1, 0.68, 1)`, 'important');
    el.style.transform = 'translate3d(0, 100%, 0)';

    setTimeout(() => {
      this.ngZone.run(() => {
        this.closePanel.emit();
        this.isDismissing = false;
      });
    }, duration * 1000);
  }

  private performSnapBack() {
    const el = this.el.nativeElement;
    el.style.setProperty('transition', 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)', 'important');
    el.style.transform = 'translate3d(0, 0, 0)';

    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.propertyName !== 'transform') return;
      el.removeEventListener('transitionend', onTransitionEnd);
      if (!this.isSwiping && !this.isDismissing) {
        el.style.removeProperty('animation');
        el.style.removeProperty('transition');
        el.style.removeProperty('transform');
      }
    };
    el.addEventListener('transitionend', onTransitionEnd);
    this.currentY = 0;
    this.hasHitThreshold = false;
  }
}
