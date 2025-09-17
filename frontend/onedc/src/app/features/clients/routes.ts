import { Routes } from '@angular/router';
import { ClientsComponent } from './clients.component';
import { adminGuard } from '../../core/guards/admin.guard';

export const CLIENTS_ROUTES: Routes = [
  { path: '', component: ClientsComponent, canActivate: [adminGuard] }
];
