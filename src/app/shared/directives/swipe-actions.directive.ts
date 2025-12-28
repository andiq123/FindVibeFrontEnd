import { Directive, ElementRef, HostListener, output, inject } from '@angular/core';

@Directive({
  selector: '[appSwipeActions]',
  standalone: true
})
export class SwipeActionsDirective {
  private el = inject(ElementRef);

  swipeRight = output<void>();
  swipeLeft = output<void>();

  private startX = 0;
  private currentX = 0;
  private isSwiping = false;
  private readonly THRESHOLD = 100;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    this.startX = event.touches[0].clientX;
    this.isSwiping = true;
    this.el.nativeElement.style.transition = 'none';
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (!this.isSwiping) return;
    this.currentX = event.touches[0].clientX - this.startX;

    const translateX = this.currentX * 0.5;
    this.el.nativeElement.style.transform = `translateX(${translateX}px)`;
  }

  @HostListener('touchend')
  onTouchEnd() {
    this.isSwiping = false;
    this.el.nativeElement.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';

    if (this.currentX > this.THRESHOLD) {
      this.swipeRight.emit();
    } else if (this.currentX < -this.THRESHOLD) {
      this.swipeLeft.emit();
    }

    this.el.nativeElement.style.transform = 'translateX(0)';
    this.currentX = 0;
  }

  @HostListener('touchcancel')
  onTouchCancel() {
    this.isSwiping = false;
    this.el.nativeElement.style.transform = 'translateX(0)';
  }
}
