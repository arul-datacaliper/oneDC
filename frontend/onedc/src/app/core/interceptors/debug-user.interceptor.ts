import { HttpInterceptorFn } from '@angular/common/http';

export const debugUserInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/login')) return next(req);
  const modifiedReq = req.clone({
    setHeaders: {
      'X-Debug-UserId': '59bd99db-9be0-4a55-a062-ecf8636896ad'
    }
  });
  return next(modifiedReq);
};