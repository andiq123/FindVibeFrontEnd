import { Injectable, signal } from "@angular/core";

export enum ToastType {
  SUCCESS = "success",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
}

@Injectable({
  providedIn: "root",
})
export class ToastService {
  private toasts = signal<Toast[]>([]);
  private nextId = 0;

  get toasts$() {
    return this.toasts.asReadonly();
  }

  success(message: string, duration = 3000): string {
    return this.show({
      type: ToastType.SUCCESS,
      message,
      duration,
    });
  }

  error(
    message: string,
    options?: { duration?: number; action?: Toast["action"] },
  ): string {
    return this.show({
      type: ToastType.ERROR,
      message,
      duration: options?.duration ?? 5000,
      action: options?.action,
    });
  }

  warning(message: string, duration = 4000): string {
    return this.show({
      type: ToastType.WARNING,
      message,
      duration,
    });
  }

  info(message: string, duration = 3000): string {
    return this.show({
      type: ToastType.INFO,
      message,
      duration,
    });
  }

  show(config: Omit<Toast, "id">): string {
    const id = `toast-${this.nextId++}`;
    const toast: Toast = { id, ...config };

    this.toasts.update((toasts) => [...toasts, toast]);

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => this.dismiss(id), toast.duration);
    }

    return id;
  }

  dismiss(id: string): void {
    this.toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  dismissAll(): void {
    this.toasts.set([]);
  }
}
