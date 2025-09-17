import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('/auth/login')) return next(req);
  
  const token = localStorage.getItem('auth_token');
  if (!token) {
    console.warn('No auth token found for request:', req.url);
    return next(req);
  }
  
  console.log('Adding auth token to request:', req.url, 'Token starts with:', token.substring(0, 20) + '...');
  
  const modifiedReq = req.clone({
    setHeaders: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return next(modifiedReq);
};