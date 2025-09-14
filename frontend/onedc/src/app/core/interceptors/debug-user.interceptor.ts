import { HttpInterceptorFn } from '@angular/common/http';

export const debugUserInterceptor: HttpInterceptorFn = (req, next) => {
  // Add debug user header for development
  const modifiedReq = req.clone({
    setHeaders: {
      'X-Debug-UserId': 'f6f173b6-ac51-4944-9082-e670533438e9' // Mock user ID
    }
  });
  
  return next(modifiedReq);
};
