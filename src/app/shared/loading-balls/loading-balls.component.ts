import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-loading-balls',
  standalone: true,
  template: `
    <div class="flex gap-3">
      <span class="loading loading-ball loading-md text-primary"></span>
      <span class="loading loading-ball loading-md text-primary opacity-60"></span>
      <span class="loading loading-ball loading-md text-primary opacity-30"></span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingBallsComponent {}
