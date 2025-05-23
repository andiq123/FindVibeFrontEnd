import {
  Directive,
  effect,
  HostBinding,
  HostListener,
  output,
  signal,
} from '@angular/core';

@Directive({
  selector: '[appSwipeDown]',
  standalone: true,
})
export class SwipeDownDirective {
  topSignal = signal<number>(0);
  offsetPixels = signal<number>(0);
  startTime = signal<Date>(new Date());
  lastMoveTime = signal<number>(0);
  lastMoveY = signal<number>(0);
  onClose = output<void>();
  swipeStartTrigger = signal<number>(450);
  minDrag = 10; // px before drag starts
  isDragging = false;

  @HostBinding('style.transform') translateY = 'translateY(0px)';
  @HostBinding('style.transition') transition = '';
  @HostBinding('class.slideToZero') slideToZero = false;
  @HostBinding('class.slideUp') slideUp = true;

  constructor() {
    effect(() => {
      this.translateY = `translateY(${this.topSignal()}px)`;
    });
  }

  @HostListener('touchstart', ['$event'])
  onSwipeStart(event: TouchEvent) {
    const currentPixels = event.touches[0].clientY;
    this.offsetPixels.set(currentPixels);
    this.lastMoveY.set(currentPixels);
    this.lastMoveTime.set(Date.now());
    this.isDragging = false;
    if (currentPixels > this.swipeStartTrigger()) return;
    this.startTime.set(new Date());
    this.slideUp = false;
    this.transition = '';
  }

  @HostListener('touchmove', ['$event'])
  onSwipeMove(event: TouchEvent) {
    const currentPixels = event.touches[0].clientY;
    if (this.offsetPixels() > this.swipeStartTrigger()) return;
    const delta = currentPixels - this.offsetPixels();
    if (!this.isDragging && Math.abs(delta) > this.minDrag) {
      this.isDragging = true;
    }
    if (this.isDragging) {
      this.topSignal.set(Math.max(0, delta));
      this.lastMoveY.set(currentPixels);
      this.lastMoveTime.set(Date.now());
      this.transition = '';
    }
  }

  @HostListener('touchend', ['$event'])
  onSwipeEnd(event: TouchEvent) {
    const closeSizeTrigger = 300;
    const timeCloseTrigger = 600;
    const duration = new Date().getTime() - this.startTime().getTime();
    const deltaY = this.lastMoveY() - this.offsetPixels();
    const deltaTime = Date.now() - this.lastMoveTime();
    const velocity = deltaY / (deltaTime || 1); // px/ms
    // If fast flick (velocity > 1.2 px/ms) or dragged far enough, close
    if ((duration < timeCloseTrigger && this.topSignal() > closeSizeTrigger) || velocity > 1.2) {
      this.transition = 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)';
      this.topSignal.set(window.innerHeight); // animate out
      setTimeout(() => this.onClose.emit(), 200);
    } else {
      // Spring back
      this.transition = 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)';
      this.slideToZero = true;
      setTimeout(() => {
        this.transition = '';
      }, 350);
    }
    this.offsetPixels.set(0);
    this.isDragging = false;
  }

  @HostListener('animationend', ['$event'])
  onAnimationEnd(e: AnimationEvent) {
    const isSlideToZero = e.animationName.includes('slideToZero');
    if (isSlideToZero) {
      this.slideToZero = false;
      this.topSignal.set(0);
    }
  }
}
