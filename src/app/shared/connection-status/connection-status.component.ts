import {
  Component,
  inject,
  computed,
  signal,
  effect,
  ChangeDetectionStrategy,
} from "@angular/core";
import { SettingsService } from "../../core/services/settings.service";
@Component({
  selector: "app-connection-status",
  standalone: true,
  imports: [],
  templateUrl: "./connection-status.component.html",
  styleUrl: "./connection-status.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionStatusComponent {
  private readonly settingsService = inject(SettingsService);
  readonly isCheckedServer = this.settingsService.isCheckedServer;
  readonly isOffline = this.settingsService.isOffline;
  readonly shouldShow = signal(false);
  readonly isPending = computed(() => !this.isCheckedServer());
  constructor() {
    effect(() => {
      const rawVisible = !this.isCheckedServer() || this.isOffline();
      this.shouldShow.set(rawVisible);
    });
  }
}
