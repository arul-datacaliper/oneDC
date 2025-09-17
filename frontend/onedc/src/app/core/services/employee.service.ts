import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EmployeeDashboardMetrics {
  totalAssignedTasks: number;
  totalSubmittedHours: number;
  totalApprovedHours: number;
}

export interface EmployeeTask {
  taskId: string;
  taskName: string;
  projectName: string;
  status: string;
  managerName: string;
  startDate: string;
  endDate: string;
  description?: string;
  priority?: string;
}

export interface TimesheetSummary {
  totalHours: number;
  submittedHours: number;
  approvedHours: number;
  pendingHours: number;
  rejectedHours: number;
}

export interface ProjectUtilization {
  projectId: string;
  projectName: string;
  totalAllocatedHours: number;
  totalWorkedHours: number;
  utilizationPercentage: number;
  status: string;
  startDate: string;
  endDate: string;
  managerName: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}`;

  // Get employee dashboard metrics
  getEmployeeDashboardMetrics(userId: string): Observable<EmployeeDashboardMetrics> {
    return this.http.get<EmployeeDashboardMetrics>(`${this.apiUrl}/employees/${userId}/dashboard-metrics`);
  }

  // Get tasks assigned to employee
  getAssignedTasks(userId: string): Observable<EmployeeTask[]> {
    return this.http.get<EmployeeTask[]>(`${this.apiUrl}/employees/${userId}/tasks`);
  }

  // Get timesheet summary for employee
  getTimesheetSummary(userId: string, dateRange?: string): Observable<TimesheetSummary> {
    const params = dateRange ? `?range=${dateRange}` : '';
    return this.http.get<TimesheetSummary>(`${this.apiUrl}/employees/${userId}/timesheet-summary${params}`);
  }

  // Get project utilization for employee
  getProjectUtilization(userId: string): Observable<ProjectUtilization[]> {
    return this.http.get<ProjectUtilization[]>(`${this.apiUrl}/employees/${userId}/project-utilization`);
  }
}
