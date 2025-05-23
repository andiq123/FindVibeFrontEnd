import {
  Directive,
  effect,
  HostBinding,
  HostListener,
  output,
  signal,
  OnDestroy
} from '@angular/core';

@Directive({
  selector: '[appSwipeDown]',
  standalone: true,
})
export class SwipeDownDirective implements OnDestroy {
  topSignal = signal<number>(0);
  offsetPixels = signal<number>(0);
  startTime = signal<Date>(new Date());
  onClose = output<void>();
  swipeStartTrigger = signal<number>(450);
  isAnimating = signal<boolean>(false);

  @HostBinding('style.transform') translateY = 'translateY(0px)';
  @HostBinding('class.slideToZero') slideToZero = false;
  @HostBinding('class.slideUp') slideUp = true;
  @HostBinding('style.transition') transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

  constructor() {
    effect(() => {
      if (!this.isAnimating()) {
        this.translateY = `translateY(${this.topSignal()}px)`;
      }
    });
  }

  @HostListener('touchstart', ['$event'])
  onSwipeStart(event: TouchEvent) {
    if (this.isAnimating()) return;
    
    const currentPixels = event.touches[0].clientY;
    this.offsetPixels.set(currentPixels);
    if (currentPixels > this.swipeStartTrigger()) return;
    this.startTime.set(new Date());
    this.slideUp = false;
    this.transition = 'none';
  }

  @HostListener('touchmove', ['$event'])
  onSwipeMove(event: TouchEvent) {
    if (this.isAnimating()) return;
    
    const currentPixels = event.touches[0].clientY;
    if (this.offsetPixels() > this.swipeStartTrigger()) return;
    this.topSignal.set(currentPixels - this.offsetPixels());
  }

  @HostListener('touchend', ['$event'])
  onSwipeEnd() {
    if (this.isAnimating()) return;
    
    const closeSizeTrigger = 300;
    const timeCloseTrigger = 600;
    const duration = new Date().getTime() - this.startTime().getTime();

    if (duration < timeCloseTrigger && this.topSignal() > closeSizeTrigger) {
      this.isAnimating.set(true);
      this.onClose.emit();
      this.resetState();
    } else {
      if (this.offsetPixels() < this.swipeStartTrigger()) {
        this.slideToZero = true;
        this.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
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
      this.isAnimating.set(false);
      this.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  }

  private resetState() {
    this.topSignal.set(0);
    this.offsetPixels.set(0);
    this.slideToZero = false;
    this.slideUp = true;
    this.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    setTimeout(() => {
      this.isAnimating.set(false);
    }, 300);
  }

  ngOnDestroy() {
    this.resetState();
  }
}
