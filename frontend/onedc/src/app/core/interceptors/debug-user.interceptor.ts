import { HttpInterceptorFn } from '@angular/common/http';

export const debugUserInterceptor: HttpInterceptorFn = (req, next) => {
  // Add debug user header for development
  const modifiedReq = req.clone({
    setHeaders: {
      'X-Debug-UserId': '59bd99db-9be0-4a55-a062-ecf8636896ad' // Mock user ID
    }
  });
  
  return next(modifiedReq);
};
//59bd99db-9be0-4a55-a062-ecf8636896ad
//f6f173b6-ac51-4944-9082-e670533438e9