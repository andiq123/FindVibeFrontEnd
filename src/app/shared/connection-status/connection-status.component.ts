import { Component, inject, computed, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-connection-status',
  imports: [],
  templateUrl: './connection-status.component.html',
  styleUrl: './connection-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConnectionStatusComponent {
  private readonly settingsService = inject(SettingsService);

  readonly isCheckedServer = this.settingsService.isCheckedServer;
  readonly isServerDown = this.settingsService.isServerDown;
  
  readonly shouldShow = signal(false);
  
  readonly isPending = computed(() => !this.isCheckedServer());
  
  constructor() {
    effect((onCleanup) => {
      const rawVisible = !this.isCheckedServer() || this.isServerDown();
      
      if (rawVisible) {
        const timer = setTimeout(() => {
          this.shouldShow.set(true);
        }, 1000); 
        onCleanup(() => clearTimeout(timer));
      } else {
        this.shouldShow.set(false);
      }
    });
  }
}
