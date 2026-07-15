import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faWaveSquare } from '../../icons';

@Component({
  selector: 'app-server-awakening',
  standalone: true,
  imports: [FontAwesomeModule],
  template: `
    <div class="w-full flex flex-col justify-center items-center gap-4 h-[60vh]">
      <div class="text-center space-y-3">
        <div class="relative w-28 h-28 mx-auto mb-8">
          <div
            class="absolute inset-0 bg-primary/30 rounded-full animate-ping"
          ></div>
          <div
            class="absolute inset-0 bg-primary/20 rounded-full animate-pulse"
          ></div>
          <div
            class="relative bg-gradient-to-br from-primary/20 to-accent/20 rounded-full w-full h-full flex items-center justify-center ring-2 ring-primary/30"
          >
            <fa-icon
              [icon]="faWaveSquare"
              class="text-5xl text-primary animate-pulse"
            />
          </div>
        </div>
        <h1 class="text-3xl font-bold tracking-tight mb-2 bg-gradient-to-r from-base-content to-base-content/60 bg-clip-text text-transparent">
          Vibe Server is awakening...
        </h1>
        <p class="text-base-content/60 text-base max-w-[300px] mx-auto leading-relaxed">
          This might take a few moments as we spin up the high-fidelity audio
          engine.
        </p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerAwakeningComponent {
  faWaveSquare = faWaveSquare;
}
