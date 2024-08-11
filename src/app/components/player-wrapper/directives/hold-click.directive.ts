import {
  Directive,
  effect,
  HostBinding,
  HostListener,
  output,
  signal,
} from '@angular/core';
import { interval, map, Subscription, take, takeWhile } from 'rxjs';

@Directive({
  selector: '[appHoldClick]',
  standalone: true,
})
export class HoldClickDirective {
  scale = signal(1);
  timerFinished = output();
  @HostBinding('style.transform') transform = 'scale(1)';
  @HostBinding('class') class = 'transition-all duration-500 ease-in-out';

  constructor() {
    effect(() => {
      this.transform = `scale(${this.scale()})`;
    });
  }

  subscription?: Subscription;
  countdown(startTimer: number) {
    return interval(1000).pipe(
      map(() => startTimer--),
      takeWhile(() => startTimer > -1)
    );
  }

  @HostListener('mousedown')
  @HostListener('touchstart')
  mouseDown() {
    this.subscription = this.countdown(3).subscribe((time) => {
      this.scale.set(time);
      if (time === 1) {
        this.timerFinished.emit();
      }
    });
  }

  @HostListener('mouseup')
  @HostListener('touchend')
  mouseUp() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.scale.set(1);
  }
}
