import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { forkJoin, Observable } from 'rxjs';

export type TimesheetStatus = 'DRAFT'|'SUBMITTED'|'APPROVED'|'REJECTED'|'LOCKED';

export interface ApprovalRow {
  entryId: string;
  userId: string;
  userName?: string;
  projectId: string;
  projectCode?: string;
  projectName?: string;
  workDate: string;       // YYYY-MM-DD
  hours: number;
  description?: string;
  ticketRef?: string;
  status: TimesheetStatus;
  submittedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ApprovalsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}`;

  list(from: string, to: string, projectId?: string, userId?: string) {
    let params = new HttpParams().set('from', from).set('to', to);
    if (projectId) params = params.set('projectId', projectId);
    if (userId)    params = params.set('userId', userId);
    // Assuming your backend has an approvals list endpoint returning SUBMITTED by default
    return this.http.get<ApprovalRow[]>(`${this.base}/approvals`, { params });
  }

  approve(entryId: string) {
    return this.http.post(`${this.base}/approvals/${entryId}/approve`, {});
  }

  reject(entryId: string, reason: string) {
    return this.http.post(`${this.base}/approvals/${entryId}/reject`, { reason });
  }
   bulkApprove(ids: string[]): Observable<unknown> {
    return forkJoin(ids.map(id => this.approve(id)));
  }
  bulkReject(ids: string[], reason: string): Observable<unknown> {
    return forkJoin(ids.map(id => this.reject(id, reason)));
  }
}
