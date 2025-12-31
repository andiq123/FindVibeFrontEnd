import { Component, inject, ChangeDetectionStrategy } from "@angular/core";
import { ToastService, ToastType } from "../../../core/services/toast.service";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import {
  faCheckCircle,
  faExclamationCircle,
  faExclamationTriangle,
  faInfoCircle,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

@Component({
  selector: "app-toast",
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: "./toast.component.html",
  styleUrl: "./toast.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  private toastService = inject(ToastService);

  toasts = this.toastService.toasts$;
  ToastType = ToastType;

  faCheckCircle = faCheckCircle;
  faExclamationCircle = faExclamationCircle;
  faExclamationTriangle = faExclamationTriangle;
  faInfoCircle = faInfoCircle;
  faTimes = faTimes;

  getIcon(type: ToastType) {
    switch (type) {
      case ToastType.SUCCESS:
        return this.faCheckCircle;
      case ToastType.ERROR:
        return this.faExclamationCircle;
      case ToastType.WARNING:
        return this.faExclamationTriangle;
      case ToastType.INFO:
        return this.faInfoCircle;
    }
  }

  dismiss(id: string) {
    this.toastService.dismiss(id);
  }

  handleAction(
    action: { label: string; handler: () => void },
    toastId: string,
  ) {
    action.handler();
    this.dismiss(toastId);
  }
}
