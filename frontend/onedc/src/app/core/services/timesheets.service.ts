import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TimesheetEntry, TaskType } from '../../shared/models';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class TimesheetsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/timesheets`;

  list(from: string, to: string) {
    return this.http.get<TimesheetEntry[]>(`${this.base}?from=${from}&to=${to}`);
  }

  // Admin method to get timesheets for specific user
  listForUser(userId: string, from: string, to: string) {
    return this.http.get<TimesheetEntry[]>(`${this.base}/user/${userId}?from=${from}&to=${to}`);
  }

  // Admin method to get timesheets for specific project
  listForProject(projectId: string, from: string, to: string) {
    return this.http.get<TimesheetEntry[]>(`${this.base}/project/${projectId}?from=${from}&to=${to}`);
  }

  // Admin method to get all timesheets (with filters)
  listAll(from: string, to: string, userId?: string, projectId?: string) {
    let url = `${this.base}/all?from=${from}&to=${to}`;
    if (userId) url += `&userId=${userId}`;
    if (projectId) url += `&projectId=${projectId}`;
    return this.http.get<TimesheetEntry[]>(url);
  }
  create(body: { projectId: string; workDate: string; hours: number; description?: string; ticketRef?: string; taskType?: TaskType; taskId?: string; }) {
    console.log('TimesheetsService: Creating entry with body:', body); // Debug log
    console.log('TimesheetsService: API endpoint:', this.base); // Debug log
    return this.http.post<TimesheetEntry>(this.base, body);
  }
  update(id: string, body: { hours: number; description?: string; ticketRef?: string; taskType?: TaskType; taskId?: string; }) {
    return this.http.put<TimesheetEntry>(`${this.base}/${id}`, body);
  }
  submit(id: string) {
    return this.http.post<TimesheetEntry>(`${this.base}/${id}/submit`, {});
  }
  delete(id: string) {
  return this.http.delete(`${this.base}/${id}`);
}
}
