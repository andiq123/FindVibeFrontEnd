import {
  ApplicationConfig,
  provideZoneChangeDetection,
  isDevMode,
  ErrorHandler,
} from "@angular/core";

import {
  provideRouter,
  withComponentInputBinding,
  withRouterConfig,
  withViewTransitions,
  RouteReuseStrategy,
  withInMemoryScrolling,
} from "@angular/router";

import { routes } from "./app.routes";
import { provideHttpClient } from "@angular/common/http";
import { provideServiceWorker } from "@angular/service-worker";

import { CustomReuseStrategy } from "./core/strategies/custom-reuse-strategy";
import { GlobalErrorHandler } from "./core/handlers/global-error.handler";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterConfig({
        paramsInheritanceStrategy: "always",
      }),
      withInMemoryScrolling({
        scrollPositionRestoration: "enabled",
        anchorScrolling: "enabled",
      }),
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition, from, to }) => {
          const cachedRoutes = ["library", "songs", "songs/:query", "recent"];
          const toPath = to?.routeConfig?.path || "";
          const fromPath = from?.routeConfig?.path || "";

          if (
            cachedRoutes.includes(toPath) ||
            cachedRoutes.includes(fromPath)
          ) {
            transition.skipTransition();
          }
        },
      }),
    ),
    { provide: RouteReuseStrategy, useClass: CustomReuseStrategy },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideHttpClient(),
    provideServiceWorker("ngsw-worker.js", {
      enabled: !isDevMode(),
      registrationStrategy: "registerWhenStable:30000",
    }),
  ],
};
