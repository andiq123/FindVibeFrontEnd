import { Directive, ElementRef, HostListener, output, inject } from '@angular/core';

@Directive({
  selector: '[appPullToRefresh]',
  standalone: true
})
export class PullToRefreshDirective {
  private el = inject(ElementRef);
  refresh = output<void>();

  private startY = 0;
  private currentY = 0;
  private isPulling = false;
  private readonly REFRESH_THRESHOLD = 80;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (this.el.nativeElement.scrollTop === 0) {
      this.startY = event.touches[0].clientY;
      this.isPulling = true;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (!this.isPulling) return;
    
    this.currentY = event.touches[0].clientY - this.startY;
    
    if (this.currentY > 0) {
      event.preventDefault(); // Prevent browser refresh
      const translateY = Math.min(this.currentY * 0.4, this.REFRESH_THRESHOLD + 20);
      this.el.nativeElement.style.transform = `translateY(${translateY}px)`;
    } else {
      this.isPulling = false;
    }
  }

  @HostListener('touchend')
  onTouchEnd() {
    if (!this.isPulling) return;
    this.isPulling = false;
    
    this.el.nativeElement.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
    
    if (this.currentY > this.REFRESH_THRESHOLD) {
      this.refresh.emit();
    }
    
    this.el.nativeElement.style.transform = 'translateY(0)';
    this.currentY = 0;
  }
}
