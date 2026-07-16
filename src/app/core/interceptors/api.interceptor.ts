import {
  HttpErrorResponse,
  HttpEventType,
  HttpInterceptorFn,
} from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, retry, tap, throwError, timeout, timer, TimeoutError } from "rxjs";
import { environment } from "../../../environments/environment";
import { SettingsService } from "../services/settings.service";

/** Render cold start: gateway 504s until the process listens, then 503 "starting" until DB mounts. */
function isTransient(err: unknown): boolean {
  if (err instanceof TimeoutError) return true;
  return (
    err instanceof HttpErrorResponse &&
    [0, 408, 429, 503, 504].includes(err.status)
  );
}

/**
 * Single HTTP policy for all API calls: 15s timeout, and transient
 * cold-start failures on GETs retried with backoff (1s/2s/4s).
 * /health is excluded — wakeUntilUp() owns its own retry loop.
 * Any successful response marks the server up.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.API_URL)) return next(req);
  const settings = inject(SettingsService);
  const isHealth = req.url.includes("/health");
  // ponytail: mutations are not retried — a duplicated POST is worse than a failed one
  const retries = req.method === "GET" && !isHealth ? 3 : 0;
  return next(req).pipe(
    timeout(15_000),
    retry({
      count: retries,
      delay: (err, n) => {
        if (!isTransient(err)) throw err;
        return timer(1000 * 2 ** (n - 1));
      },
    }),
    tap((event) => {
      if (event.type === HttpEventType.Response) settings.setServerUp();
    }),
    catchError((err) => {
      // Exhausted cold-start / network — surface the chip. 4xx stays quiet.
      if (!isHealth && isTransient(err)) settings.setServerDown();
      return throwError(() => err);
    }),
  );
};
