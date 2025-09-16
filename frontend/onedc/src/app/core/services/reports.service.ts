
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProjectUtilizationParams {
  from: string;           // YYYY-MM-DD
  to: string;             // YYYY-MM-DD
  projectId?: string;
  userId?: string;
  groupBy: 'project' | 'user' | 'user_project';
}

export interface ProjectUtilizationRow {
  projectId: string;
  projectCode?: string;
  projectName?: string;
  projectBudgetHours?: number;
  userId?: string;
  userName?: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  utilizationPercentage?: number;  // vs project.budgetHours
  entryCount: number;
}

export interface ProjectUtilizationReport {
  parameters: ProjectUtilizationParams;
  data: ProjectUtilizationRow[];
  summary: {
    totalHours: number;
    totalBillableHours: number;
    totalNonBillableHours: number;
    averageUtilization?: number;
    projectCount: number;
    userCount: number;
  };
}

export interface ProjectBurndownParams {
  projectId: string;
  from: string;           // YYYY-MM-DD
  to: string;             // YYYY-MM-DD
  interval: 'day' | 'week';
}

export interface ProjectBurndownDataPoint {
  bucketStart: string;    // YYYY-MM-DD
  actualCumHours: number;
  budgetHours: number;
}

export interface ProjectBurndownReport {
  parameters: ProjectBurndownParams;
  projectInfo: {
    projectId: string;
    projectCode: string;
    projectName: string;
    budgetHours: number;
    startDate?: string;
    endDate?: string;
  };
  data: ProjectBurndownDataPoint[];
  summary: {
    totalActualHours: number;
    totalBudgetHours: number;
    utilizationPercentage: number;
    remainingBudget: number;
    projectedCompletion?: string;
  };
}

export interface MissingTimesheetsParams {
  from: string;           // YYYY-MM-DD
  to: string;             // YYYY-MM-DD
  userId?: string;
  skipWeekends?: boolean;
}

export interface MissingTimesheetsRow {
  userId: string;
  userName: string;
  date: string;           // YYYY-MM-DD
  dayOfWeek: string;
}

export interface MissingTimesheetsReport {
  parameters: MissingTimesheetsParams;
  data: MissingTimesheetsRow[];
  summary: {
    totalMissingDays: number;
    affectedUsers: number;
    dateRange: {
      from: string;
      to: string;
      workingDays: number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/reports`;

  // Legacy method - keeping for compatibility
  utilization(from: string, to: string, groupBy: 'user'|'project'|'user_project' = 'project', projectId?: string, userId?: string) {
    let url = `${this.base}/utilization?from=${from}&to=${to}&groupBy=${groupBy}`;
    if (projectId) url += `&projectId=${projectId}`;
    if (userId)    url += `&userId=${userId}`;
    return this.http.get<any[]>(url);
  }

  // Enhanced Project Utilization Report
  getProjectUtilization(params: ProjectUtilizationParams): Observable<ProjectUtilizationReport> {
    let httpParams = new HttpParams()
      .set('from', params.from)
      .set('to', params.to)
      .set('groupBy', params.groupBy);

    if (params.projectId) httpParams = httpParams.set('projectId', params.projectId);
    if (params.userId) httpParams = httpParams.set('userId', params.userId);

    return this.http.get<ProjectUtilizationReport>(`${this.base}/project-utilization`, { params: httpParams });
  }

  downloadUtilizationCsv(from: string, to: string, groupBy: string) {
    const url = `${this.base}/utilization.csv?from=${from}&to=${to}&groupBy=${groupBy}`;
    return this.http.get(url, { responseType: 'blob' });
  }

  downloadProjectUtilizationCsv(params: ProjectUtilizationParams) {
    let httpParams = new HttpParams()
      .set('from', params.from)
      .set('to', params.to)
      .set('groupBy', params.groupBy);

    if (params.projectId) httpParams = httpParams.set('projectId', params.projectId);
    if (params.userId) httpParams = httpParams.set('userId', params.userId);

    return this.http.get(`${this.base}/project-utilization.csv`, { 
      params: httpParams, 
      responseType: 'blob' 
    });
  }

  // Project Burn-down Report
  getProjectBurndown(params: ProjectBurndownParams): Observable<ProjectBurndownReport> {
    let httpParams = new HttpParams()
      .set('projectId', params.projectId)
      .set('from', params.from)
      .set('to', params.to)
      .set('interval', params.interval);

    return this.http.get<ProjectBurndownReport>(`${this.base}/project-burndown`, { params: httpParams });
  }

  downloadProjectBurndownCsv(params: ProjectBurndownParams) {
    let httpParams = new HttpParams()
      .set('projectId', params.projectId)
      .set('from', params.from)
      .set('to', params.to)
      .set('interval', params.interval);

    return this.http.get(`${this.base}/project-burndown.csv`, { 
      params: httpParams, 
      responseType: 'blob' 
    });
  }

  // Missing Timesheets Report
  getMissingTimesheets(params: MissingTimesheetsParams): Observable<MissingTimesheetsReport> {
    let httpParams = new HttpParams()
      .set('from', params.from)
      .set('to', params.to);

    if (params.userId) httpParams = httpParams.set('userId', params.userId);
    if (params.skipWeekends !== undefined) httpParams = httpParams.set('skipWeekends', params.skipWeekends.toString());

    return this.http.get<MissingTimesheetsReport>(`${this.base}/missing-timesheets`, { params: httpParams });
  }

  downloadMissingTimesheetsCsv(params: MissingTimesheetsParams) {
    let httpParams = new HttpParams()
      .set('from', params.from)
      .set('to', params.to);

    if (params.userId) httpParams = httpParams.set('userId', params.userId);
    if (params.skipWeekends !== undefined) httpParams = httpParams.set('skipWeekends', params.skipWeekends.toString());

    return this.http.get(`${this.base}/missing-timesheets.csv`, { 
      params: httpParams, 
      responseType: 'blob' 
    });
  }
}
