import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const approverGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (!authService.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
  
  if (!authService.canApprove()) {
    // Redirect users without approval permissions to dashboard
    router.navigate(['/dashboard']);
    return false;
  }
  
  return true;
};
