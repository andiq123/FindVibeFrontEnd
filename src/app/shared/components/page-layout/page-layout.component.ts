import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-page-layout',
  template: `
    <div class="page-container">
      @if (showStickyHeader()) {
        <div class="sticky-header">
            <ng-content select="[header]"></ng-content>
        </div>
      }
      <div class="px-5 pb-24">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageLayoutComponent {
    showStickyHeader = input(true);
}
