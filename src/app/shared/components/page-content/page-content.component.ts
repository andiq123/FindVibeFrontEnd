import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { ServerAwakeningComponent } from '../server-awakening/server-awakening.component';
import { PageLayoutComponent } from '../page-layout/page-layout.component';

@Component({
  selector: 'app-page-content',
  standalone: true,
  imports: [ServerAwakeningComponent, PageLayoutComponent],
  template: `
    @if (!isServerReady()) {
      <app-server-awakening />
    } @else {
      <app-page-layout>
        <ng-content></ng-content>
      </app-page-layout>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageContentComponent {
  isServerReady = input.required<boolean>();
}
