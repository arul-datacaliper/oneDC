import { HttpInterceptorFn } from '@angular/common/http';

export const debugUserInterceptor: HttpInterceptorFn = (req, next) => {
    const id = localStorage.getItem('debugUserId'); // GUID from ts.app_user
  if (id) {
    req = req.clone({ setHeaders: { 'X-Debug-UserId': id } });
  }
  return next(req);
};
