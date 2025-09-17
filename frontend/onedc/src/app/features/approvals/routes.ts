import { Routes } from '@angular/router';
import { ApprovalsComponent } from './approvals.component';
import { approverGuard } from '../../core/guards/approver.guard';

export const APPROVALS_ROUTES: Routes = [
  { path: '', component: ApprovalsComponent, canActivate: [approverGuard] }
];