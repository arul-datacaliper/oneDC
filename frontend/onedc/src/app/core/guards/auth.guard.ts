import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('auth_token');
  if (token) return true;
  router.navigate(['/login'], { queryParams: { returnUrl: state.url }});
  return false;
};
