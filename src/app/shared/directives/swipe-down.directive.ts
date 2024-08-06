import {
  Directive,
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
  @HostBinding('style.top') top = '0px';
  onClose = output<void>();

  topSignal = signal<number>(0);
  offsetPixels = signal<number>(0);
  startTime = signal<Date>(new Date());
  swipeStartTrigger = 400;

  @HostListener('touchstart', ['$event'])
  onSwipeStart(event: TouchEvent) {
    const currentPixels = event.touches[0].clientY;
    this.offsetPixels.set(currentPixels);
    this.startTime.set(new Date());
  }

  @HostListener('touchmove', ['$event'])
  onSwipeMove(event: TouchEvent) {
    const currentPixels = event.touches[0].clientY;
    if (this.offsetPixels() > this.swipeStartTrigger) return;
    this.topSignal.set(currentPixels - this.offsetPixels());
    this.top = `${this.topSignal()}px`;
  }

  @HostListener('touchend', ['$event'])
  onSwipeEnd() {
    const closeSizeTrigger = 300;
    const timeCloseTrigger = 300;
    const duration = new Date().getTime() - this.startTime().getTime();

    if (duration < timeCloseTrigger && this.topSignal() > closeSizeTrigger) {
      this.onClose.emit();
    } else {
      this.returnTopToZeroSmoothly();
    }

    this.offsetPixels.set(0);
  }

  private returnTopToZeroSmoothly() {
    const returnAmount = 20;
    let interval: ReturnType<typeof setInterval>;
    if (this.topSignal() > 0) {
      interval = setInterval(() => {
        this.topSignal.update((top) => top - returnAmount);
        this.top = `${this.topSignal()}px`;
        if (this.topSignal() <= 0) {
          this.top = '0px';
          clearInterval(interval);
        }
      }, 10);
    } else {
      interval = setInterval(() => {
        this.topSignal.update((top) => top + returnAmount);
        this.top = `${this.topSignal()}px`;
        if (this.topSignal() >= 0) {
          this.top = '0px';
          clearInterval(interval);
        }
      }, 10);
    }
  }
}
