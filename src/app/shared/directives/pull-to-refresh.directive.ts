import { Directive, ElementRef, HostListener, output, inject, Renderer2, OnInit } from '@angular/core';
import { HapticService } from '../../core/services/haptic.service';

@Directive({
  selector: '[appPullToRefresh]',
  standalone: true
})
export class PullToRefreshDirective implements OnInit {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private hapticService = inject(HapticService);

  refresh = output<void>();

  private startY = 0;
  private currentY = 0;
  private isPulling = false;
  private hasHitThreshold = false;
  private readonly REFRESH_THRESHOLD = 80;

  private indicatorEl?: HTMLElement;
  private indicatorCircle?: HTMLElement;
  private indicatorText?: HTMLElement;

  private boundOnStart = this.onTouchStart.bind(this);
  private boundOnMove = this.onTouchMove.bind(this);
  private boundOnEnd = this.onTouchEnd.bind(this);

  ngOnInit() {
    this.createIndicator();

    this.renderer.setStyle(this.el.nativeElement, 'touch-action', 'pan-y');

    const el = this.el.nativeElement;
    el.addEventListener('touchstart', this.boundOnStart, { passive: true });
    el.addEventListener('touchmove', this.boundOnMove, { passive: false });
    el.addEventListener('touchend', this.boundOnEnd, { passive: true });
    el.addEventListener('touchcancel', this.boundOnEnd, { passive: true });
  }

  ngOnDestroy() {
    const el = this.el.nativeElement;
    el.removeEventListener('touchstart', this.boundOnStart);
    el.removeEventListener('touchmove', this.boundOnMove);
    el.removeEventListener('touchend', this.boundOnEnd);
    el.removeEventListener('touchcancel', this.boundOnEnd);
  }

  private createIndicator() {
    this.indicatorEl = this.renderer.createElement('div');
    this.renderer.addClass(this.indicatorEl, 'refresh-indicator');
    this.renderer.setStyle(this.indicatorEl, 'position', 'absolute');
    this.renderer.setStyle(this.indicatorEl, 'left', '0');
    this.renderer.setStyle(this.indicatorEl, 'right', '0');
    this.renderer.setStyle(this.indicatorEl, 'top', '-60px');
    this.renderer.setStyle(this.indicatorEl, 'display', 'flex');
    this.renderer.setStyle(this.indicatorEl, 'flex-direction', 'column');
    this.renderer.setStyle(this.indicatorEl, 'align-items', 'center');
    this.renderer.setStyle(this.indicatorEl, 'justify-content', 'center');
    this.renderer.setStyle(this.indicatorEl, 'opacity', '0');
    this.renderer.setStyle(this.indicatorEl, 'pointer-events', 'none');
    this.renderer.setStyle(this.indicatorEl, 'z-index', '50');
    this.renderer.setStyle(this.indicatorEl, 'gap', '4px');

    this.indicatorCircle = this.renderer.createElement('div');
    this.renderer.addClass(this.indicatorCircle, 'refresh-spinner');
    this.renderer.setStyle(this.indicatorCircle, 'width', '28px');
    this.renderer.setStyle(this.indicatorCircle, 'height', '28px');
    this.renderer.setStyle(this.indicatorCircle, 'border', '3px solid rgba(255,255,255,0.05)');
    this.renderer.setStyle(this.indicatorCircle, 'border-top', '3px solid var(--p)');
    this.renderer.setStyle(this.indicatorCircle, 'border-radius', '50%');

    this.indicatorText = this.renderer.createElement('span');
    this.renderer.setStyle(this.indicatorText, 'font-size', '9px');
    this.renderer.setStyle(this.indicatorText, 'font-weight', '700');
    this.renderer.setStyle(this.indicatorText, 'text-transform', 'uppercase');
    this.renderer.setStyle(this.indicatorText, 'letter-spacing', '0.05em');
    this.renderer.setStyle(this.indicatorText, 'color', 'rgba(255,255,255,0.3)');
    this.indicatorText!.innerText = 'Pull to Vibe';

    this.renderer.appendChild(this.indicatorEl, this.indicatorCircle);
    this.renderer.appendChild(this.indicatorEl, this.indicatorText);
    this.renderer.insertBefore(this.el.nativeElement.parentNode, this.indicatorEl, this.el.nativeElement);
  }

  onTouchStart(event: TouchEvent) {
    if (this.el.nativeElement.scrollTop === 0) {
      this.startY = event.touches[0].clientY;
      this.isPulling = true;
    }
  }

  onTouchMove(event: TouchEvent) {
    if (!this.isPulling) return;

    this.currentY = event.touches[0].clientY - this.startY;

    if (this.currentY > 0) {

      if (this.el.nativeElement.scrollTop === 0 && event.cancelable) {
        event.preventDefault();
      }

      const translateY = Math.min(this.currentY * 0.4, this.REFRESH_THRESHOLD + 20);
      this.el.nativeElement.style.transform = `translateY(${translateY}px)`;

      const progress = Math.min(translateY / this.REFRESH_THRESHOLD, 1);
      this.renderer.setStyle(this.indicatorEl, 'opacity', progress.toString());
      this.renderer.setStyle(this.indicatorEl, 'transform', `translateY(${translateY}px) scale(${0.8 + progress * 0.2})`);
      this.renderer.setStyle(this.indicatorCircle, 'transform', `rotate(${progress * 360}deg)`);

      if (translateY >= this.REFRESH_THRESHOLD && !this.hasHitThreshold) {
        this.hasHitThreshold = true;
        this.hapticService.medium();
        this.indicatorText!.innerText = 'Release to Refresh';
        this.renderer.setStyle(this.indicatorText, 'color', 'var(--p)');
      } else if (translateY < this.REFRESH_THRESHOLD && this.hasHitThreshold) {
        this.hasHitThreshold = false;
        this.indicatorText!.innerText = 'Pull to Vibe';
        this.renderer.setStyle(this.indicatorText, 'color', 'rgba(255,255,255,0.4)');
      }
    } else {
      this.isPulling = false;
    }
  }

  onTouchEnd() {
    if (!this.isPulling) return;
    this.isPulling = false;

    this.el.nativeElement.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
    this.renderer.setStyle(this.indicatorEl, 'transition', 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)');

    if (this.currentY * 0.4 > this.REFRESH_THRESHOLD) {
      this.refresh.emit();
      this.hapticService.success();
      this.renderer.addClass(this.indicatorCircle, 'animate-spin');
      this.indicatorText!.innerText = 'Refreshing...';

      this.renderer.setStyle(this.indicatorEl, 'transform', 'translateY(0) scale(0.8)');
      this.renderer.setStyle(this.indicatorEl, 'opacity', '0');

      setTimeout(() => {
        this.resetIndicator();
      }, 1000);
    } else {
      this.renderer.setStyle(this.indicatorEl, 'transform', 'translateY(0) scale(0.8)');
      this.renderer.setStyle(this.indicatorEl, 'opacity', '0');
      this.resetIndicator();
    }

    this.el.nativeElement.style.transform = 'translateY(0)';
    this.currentY = 0;
    this.hasHitThreshold = false;
  }

  private resetIndicator() {
    this.renderer.setStyle(this.indicatorEl, 'opacity', '0');
    this.renderer.setStyle(this.indicatorEl, 'transform', 'translateY(0) scale(0.8)');
    this.renderer.removeClass(this.indicatorCircle, 'animate-spin');
    this.indicatorText!.innerText = 'Pull to Vibe';
    this.renderer.setStyle(this.indicatorText, 'color', 'rgba(255,255,255,0.4)');

    setTimeout(() => {
      this.el.nativeElement.style.transition = '';
      this.renderer.setStyle(this.indicatorEl, 'transition', '');
    }, 400);
  }
}
