import { ApplicationConfig, provideZoneChangeDetection, isDevMode } from '@angular/core';

import { provideRouter, withComponentInputBinding, withRouterConfig, withViewTransitions, RouteReuseStrategy } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { ngrokInterceptor } from './shared/interceptors/ngrok.interceptor';
import { CustomReuseStrategy } from './core/strategies/custom-reuse-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
      withViewTransitions()
    ),
    { provide: RouteReuseStrategy, useClass: CustomReuseStrategy },
    provideHttpClient(withInterceptors([ngrokInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ],
};
