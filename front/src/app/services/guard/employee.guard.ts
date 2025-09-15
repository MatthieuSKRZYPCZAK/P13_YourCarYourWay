import {CanActivateFn, Router} from '@angular/router';
import {inject} from '@angular/core';
import {AuthService} from '../auth.service';

export const employeeGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.me();

  if (user.authenticated && user.role === 'EMPLOYEE') {
    return true;
  }

  router.navigate(['/']);
  return false;
};
