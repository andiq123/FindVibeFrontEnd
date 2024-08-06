import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SettingsService } from '../services/settings.service';

export const offlineGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const settings = inject(SettingsService);

  if (!navigator.onLine || settings.isServerDown$()) {
    router.navigate(['/library']);
    return false;
  }
  return true;
};
