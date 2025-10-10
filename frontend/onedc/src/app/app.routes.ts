import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { PasswordChangeGuard } from './core/guards/password-change.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'reset-password', loadComponent: () => import('./features/auth/reset-password.component').then(m => m.ResetPasswordComponent) },
  { path: 'change-password', loadComponent: () => import('./features/auth/change-password.component').then(m => m.ChangePasswordComponent) },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard, PasswordChangeGuard],
    children: [
     
      {path: 'dashboard', loadChildren: () => import('./features/dashboard/routes').then(m => m.DASHBOARD_ROUTES) },
      { path: 'projects',  loadChildren: () => import('./features/projects/routes').then(m => m.PROJECTS_ROUTES) },
      { path: 'clients',   loadChildren: () => import('./features/clients/routes').then(m => m.CLIENTS_ROUTES) },
      { path: 'employees', loadChildren: () => import('./features/employees/routes').then(m => m.employeesRoutes) },
      { path: 'tasks',     loadChildren: () => import('./features/tasks/routes').then(m => m.TASKS_ROUTES) },
      { path: 'timesheets',loadChildren: () => import('./features/timesheets/routes').then(m => m.TIMESHEETS_ROUTES) },
      { path: 'approvals', loadChildren: () => import('./features/approvals/routes').then(m => m.APPROVALS_ROUTES) },
      { path: 'allocations', loadComponent: () => import('./features/allocations/allocations.component').then(m => m.AllocationsComponent) },
      { path: 'reports',   loadChildren: () => import('./features/reports/routes').then(m => m.REPORTS_ROUTES), canActivate: [adminGuard] },
      { path: 'admin',     loadChildren: () => import('./features/admin/routes').then(m => m.ADMIN_ROUTES) },
      { path: 'onboarding', loadChildren: () => import('./features/onboarding/routes').then(m => m.ONBOARDING_ROUTES) },
      { path: 'profile',   loadChildren: () => import('./features/profile/routes').then(m => m.PROFILE_ROUTES) },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

