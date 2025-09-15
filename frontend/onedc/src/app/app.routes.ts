import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
     
      {path: 'dashboard', loadChildren: () => import('./features/dashboard/routes').then(m => m.DASHBOARD_ROUTES) },
      { path: 'projects',  loadChildren: () => import('./features/projects/routes').then(m => m.PROJECTS_ROUTES) },
      { path: 'timesheets',loadChildren: () => import('./features/timesheets/routes').then(m => m.TIMESHEETS_ROUTES) },
      { path: 'approvals', loadChildren: () => import('./features/approvals/routes').then(m => m.APPROVALS_ROUTES) },
      { path: 'reports',   loadChildren: () => import('./features/reports/routes').then(m => m.REPORTS_ROUTES) },
      { path: 'admin',     loadChildren: () => import('./features/admin/routes').then(m => m.ADMIN_ROUTES) },
      { path: 'onboarding', loadChildren: () => import('./features/onboarding/routes').then(m => m.ONBOARDING_ROUTES) },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  }
];

