import { Routes } from '@angular/router';

export const employeesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./employees.component').then(m => m.EmployeesComponent)
  }
];
