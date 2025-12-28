import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from '@angular/router';
import { Injectable } from '@angular/core';

@Injectable()
export class CustomReuseStrategy implements RouteReuseStrategy {
  private handlers: { [key: string]: DetachedRouteHandle } = {};

  // Routes we want to cache
  private routesToCache: string[] = ['library', 'search', 'recent'];

  shouldDetach(route: ActivatedRouteSnapshot): boolean {
    // Only detach (cache) if the route path is in our list
    const path = this.getPath(route);
    return this.routesToCache.includes(path);
  }

  store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
    const path = this.getPath(route);
    this.handlers[path] = handle;
  }

  shouldAttach(route: ActivatedRouteSnapshot): boolean {
    const path = this.getPath(route);
    return !!this.handlers[path];
  }

  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
    const path = this.getPath(route);
    if (!path) return null;
    return this.handlers[path] || null;
  }

  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    // Standard behavior: reuse if same route configuration
    return future.routeConfig === curr.routeConfig;
  }

  private getPath(route: ActivatedRouteSnapshot): string {
    // Helper to get the full path from the snapshot
    if (route.routeConfig && route.routeConfig.path) {
      return route.routeConfig.path;
    }
    return '';
  }
}
