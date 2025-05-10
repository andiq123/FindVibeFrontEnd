import { HttpInterceptorFn } from '@angular/common/http';

export const ngrokInterceptor: HttpInterceptorFn = (req, next) => {
  // 'ngrok-skip-browser-warning';
  const headers = req.headers.set('ngrok-skip-browser-warning', 'true');

  req = req.clone({
    headers,
  });

  return next(req);
};
