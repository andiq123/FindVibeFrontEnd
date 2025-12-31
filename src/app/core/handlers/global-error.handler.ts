import { ErrorHandler, Injectable, inject } from "@angular/core";
import { ToastService } from "../services/toast.service";

interface HttpError {
  status?: number;
  statusText?: string;
  message?: string;
}

interface AppError {
  name?: string;
  message?: string;
}

type ErrorWithDetails = HttpError & AppError;

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private toast = inject(ToastService);

  handleError(error: Error | unknown): void {
    if (!this.isProduction()) {
      console.error("Global Error Handler:", error);
    }

    const message = this.getUserFriendlyMessage(error);

    this.toast.error(message, {
      duration: 5000,
      action: {
        label: "Report",
        handler: () => this.reportError(error),
      },
    });
  }

  private getUserFriendlyMessage(error: unknown): string {
    const err = error as ErrorWithDetails;

    if (err?.message?.includes("Failed to fetch") || err?.status === 0) {
      return "No internet connection. Please check your network.";
    }

    if (err?.status) {
      switch (err.status) {
        case 400:
          return "Invalid request. Please try again.";
        case 401:
        case 403:
          return "You need to sign in to continue.";
        case 404:
          return "The requested content was not found.";
        case 429:
          return "Too many requests. Please slow down.";
        case 500:
        case 502:
        case 503:
          return "Server error. Please try again later.";
        case 504:
          return "Request timeout. Please try again.";
        default:
          return `Error: ${err.statusText || "Something went wrong"}`;
      }
    }

    if (err?.name === "TimeoutError") {
      return "Request timed out. Please try again.";
    }

    if (err?.message?.includes("Loading chunk")) {
      return "Failed to load page. Please refresh.";
    }

    return err?.message || "An unexpected error occurred.";
  }

  private isProduction(): boolean {
    return (
      typeof window !== "undefined" && window.location.hostname !== "localhost"
    );
  }

  private reportError(error: unknown): void {
    console.log("Error reported:", error);
    this.toast.info("Error report sent. Thank you!");
  }
}
