import { Routes } from '@angular/router';
import { AdminComponent } from './admin.component';
import { UserManagementComponent } from './user-management/user-management.component';
import { adminGuard } from '../../core/guards/admin.guard';

export const ADMIN_ROUTES: Routes = [
  { 
    path: '', 
    component: AdminComponent,
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      { path: 'users', component: UserManagementComponent },
      { path: 'employees', component: UserManagementComponent },
      // Navigation aliases for dashboard KPI cards
      { path: 'projects', redirectTo: '/projects', pathMatch: 'full' },
      { path: 'clients', redirectTo: '/clients', pathMatch: 'full' },
      { path: 'approvals', redirectTo: '/approvals', pathMatch: 'full' }
    ]
  }
];