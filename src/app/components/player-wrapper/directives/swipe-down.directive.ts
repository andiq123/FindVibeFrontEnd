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
  onClose = output<void>();
  swipeStartTrigger = 400;

  @HostBinding('style.transform') translateY = 'translateY(0px)';
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
    if (currentPixels > this.swipeStartTrigger) return;
    this.startTime.set(new Date());
    this.slideUp = false;
  }

  @HostListener('touchmove', ['$event'])
  onSwipeMove(event: TouchEvent) {
    const currentPixels = event.touches[0].clientY;
    if (this.offsetPixels() > this.swipeStartTrigger) return;
    this.topSignal.set(currentPixels - this.offsetPixels());
  }

  @HostListener('touchend', ['$event'])
  onSwipeEnd() {
    const closeSizeTrigger = 500;
    const timeCloseTrigger = 600;
    const duration = new Date().getTime() - this.startTime().getTime();

    if (duration < timeCloseTrigger && this.topSignal() > closeSizeTrigger) {
      this.onClose.emit();
    } else {
      if (this.offsetPixels() < closeSizeTrigger) {
        this.slideToZero = true;
      }
    }

    this.offsetPixels.set(0);
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
