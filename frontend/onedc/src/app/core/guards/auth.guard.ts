import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('auth_token');
  
 // console.log('Auth guard checking token:', token ? 'Token exists' : 'No token');
  
  if (!token) {
    console.log('No token found, redirecting to login');
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
  
  //console.log('Token found, allowing access to:', state.url);
  return true;
};
