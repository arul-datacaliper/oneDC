import { Routes } from '@angular/router';
import { ProjectsComponent } from './projects.component';
import { adminGuard } from '../../core/guards/admin.guard';

export const PROJECTS_ROUTES: Routes = [
  { path: '', component: ProjectsComponent, canActivate: [adminGuard] }
];
