import { computed, Injectable, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class PreviousRouteService {
  private previousUrl = signal<string>('');
  private currentUrl = signal<string>('');

  lastRouteWasRecents = computed(() => {
    return this.previousUrl() === '/recent';
  });

  constructor(private router: Router) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        if (!this.previousUrl()) {
          this.currentUrl.set(event.url);
        }

        this.previousUrl.set(this.currentUrl());
        this.currentUrl.set(event.url);
      }
    });
  }
}
