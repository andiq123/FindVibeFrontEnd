import { Component, ChangeDetectionStrategy } from '@angular/core';
@Component({
  selector: 'app-page-layout',
  template: `
    <div class="w-full max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto min-h-screen pb-safe relative overflow-x-hidden">
      <div class="fixed inset-0 pointer-events-none -z-10 overflow-hidden w-screen h-screen left-1/2 -translate-x-1/2 hidden sm:block">
        <div class="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] bg-primary/10 blur-[130px] rounded-full animate-pulse"></div>
        <div class="absolute top-[20%] -right-0 w-[60vw] h-[60vw] bg-accent/8 blur-[160px] rounded-full animate-pulse" style="animation-delay: 2s;"></div>
        <div class="absolute -bottom-[10%] left-[10%] w-[55vw] h-[55vw] bg-secondary/8 blur-[140px] rounded-full animate-pulse" style="animation-delay: 4s;"></div>
      </div>
      <div class="px-4 sm:px-5 lg:px-8 xl:px-10 pb-24 lg:pb-12 pt-4 lg:pt-8">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageLayoutComponent {}
