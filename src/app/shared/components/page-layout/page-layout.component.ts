import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-page-layout',
  template: `
    <div class="w-full max-w-3xl mx-auto min-h-screen pb-safe relative overflow-x-hidden">
      <div class="fixed inset-0 pointer-events-none -z-10 overflow-hidden w-screen h-screen left-1/2 -translate-x-1/2">
        <div class="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] bg-primary/10 blur-[130px] rounded-full animate-pulse"></div>
        <div class="absolute top-[20%] -right-0 w-[60vw] h-[60vw] bg-accent/8 blur-[160px] rounded-full animate-pulse" style="animation-delay: 2s;"></div>
        <div class="absolute -bottom-[10%] left-[10%] w-[55vw] h-[55vw] bg-secondary/8 blur-[140px] rounded-full animate-pulse" style="animation-delay: 4s;"></div>
      </div>

      @if (showStickyHeader()) {
        <div class="sticky top-0 z-[20] pt-[max(env(safe-area-inset-top),1rem)] pb-4 px-5 border-b border-white/5 bg-base-200/40 backdrop-blur-[32px] transition-all duration-300">
            <ng-content select="[header]"></ng-content>
        </div>
      }
      <div class="px-5 pb-24">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageLayoutComponent {
    showStickyHeader = input(true);
}
