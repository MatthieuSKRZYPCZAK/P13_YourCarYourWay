import { Routes } from '@angular/router';
import {employeeGuard} from './services/guard/employee.guard';

export const routes: Routes = [
  { path: '',
    loadComponent: () => import('./pages/home/home').then(m => m.Home) },
  { path: 'signin',
    loadComponent: () => import('./pages/signin/signin').then(m => m.Signin) },
  { path: 'support',
    canActivate: [employeeGuard],
    loadComponent: () => import('./pages/support/support').then(m => m.Support) },
  { path: '**', redirectTo: '' }
];
