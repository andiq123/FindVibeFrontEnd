import { Component, inject, computed } from '@angular/core';
import { SettingsService } from '../../core/services/settings.service';

@Component({
  selector: 'app-connection-status',
  imports: [],
  templateUrl: './connection-status.component.html',
  styleUrl: './connection-status.component.scss'
})
export class ConnectionStatusComponent {
  private readonly settingsService = inject(SettingsService);

  readonly isCheckedServer = this.settingsService.isCheckedServer;
  readonly isServerDown = this.settingsService.isServerDown;
  
  readonly isVisible = computed(() => 
    !this.isCheckedServer() || this.isServerDown()
  );
  
  readonly isPending = computed(() => !this.isCheckedServer());
}
