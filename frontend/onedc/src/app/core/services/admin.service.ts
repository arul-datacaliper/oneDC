import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminDashboardMetrics {
  totalEmployees: number;
  totalProjects: number;
  totalClients: number;
  activeProjects: number;
  activeEmployees: number;
  pendingApprovals: number;
}

export interface TopProjectMetrics {
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  openTasksCount: number;
  totalTasksCount: number;
  utilizationPercentage: number;
  isBillable: boolean;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/admin`;

  getDashboardMetrics(): Observable<AdminDashboardMetrics> {
    return this.http.get<AdminDashboardMetrics>(`${this.baseUrl}/dashboard-metrics`);
  }

  getTopProjects(limit: number = 10): Observable<TopProjectMetrics[]> {
    return this.http.get<TopProjectMetrics[]>(`${this.baseUrl}/top-projects?limit=${limit}`);
  }
}
