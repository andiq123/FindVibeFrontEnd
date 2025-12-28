import {
  Component,
  input,
  signal,
  ElementRef,
  viewChild,
  AfterViewInit,
  OnDestroy,
  effect,
} from '@angular/core';

@Component({
  selector: 'app-moving-title',
  standalone: true,
  imports: [],
  templateUrl: './moving-title.component.html',
  styleUrl: './moving-title.component.scss',
})
export class MovingTitleComponent implements AfterViewInit, OnDestroy {
  title = input.required<string>();
  classes = input<string>('text-md font-bold');
  isActive = input<boolean>(true);

  // Direct DOM Access for overflow detection
  container = viewChild<ElementRef<HTMLDivElement>>('container');
  content = viewChild<ElementRef<HTMLDivElement>>('content');

  isOverflowing = signal<boolean>(false);
  animationDuration = signal<number>(10);
  
  private resizeObserver?: ResizeObserver;

  constructor() {
    // Re-check overflow when title changes
    effect(() => {
      this.title();
      // Small delay to allow DOM update
      setTimeout(() => this.checkOverflow(), 0);
    });
  }

  ngAfterViewInit() {
    this.checkOverflow();
    
    // Watch for container size changes
    const containerEl = this.container()?.nativeElement;
    if (containerEl && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.checkOverflow());
      this.resizeObserver.observe(containerEl);
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
  }

  private checkOverflow() {
    const containerEl = this.container()?.nativeElement;
    const contentEl = this.content()?.nativeElement;

    if (containerEl && contentEl) {
      const hasOverflow = contentEl.scrollWidth > containerEl.clientWidth;
      if (this.isOverflowing() !== hasOverflow) {
        this.isOverflowing.set(hasOverflow);
        // Adjust duration based on text length (approx 18px per second for a maximum premium, slower feel)
        const scrollDistance = contentEl.scrollWidth / 2;
        const duration = Math.max(12, scrollDistance / 18);
        this.animationDuration.set(duration);
      }
    }
  }
}
