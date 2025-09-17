import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export type TaskStatus = 'NEW'|'IN_PROGRESS'|'BLOCKED'|'COMPLETED'|'CANCELLED';

export interface ProjectTask {
  taskId: string;
  projectId: string;
  assignedUserId?: string;
  assignedUserName?: string;
  title: string;
  description?: string;
  label?: string;
  estimatedHours?: number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  status: TaskStatus;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  label?: string;
  assignedUserId?: string;
  estimatedHours?: number;
  startDate?: string;
  endDate?: string;
}
export interface UpdateTaskRequest extends CreateTaskRequest {
  status: TaskStatus;
}

@Injectable({ providedIn: 'root' })
export class TasksService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  list(projectId: string, opts: { assignedUserId?: string; status?: TaskStatus } = {}): Observable<ProjectTask[]> {
    let params = new HttpParams();
    if (opts.assignedUserId) params = params.set('assignedUserId', opts.assignedUserId);
    if (opts.status) params = params.set('status', opts.status);
    return this.http.get<ProjectTask[]>(`${this.base}/projects/${projectId}/tasks`, { params });
  }
  get(taskId: string) {
    return this.http.get<ProjectTask>(`${this.base}/tasks/${taskId}`);
  }
  create(projectId: string, payload: CreateTaskRequest) {
    return this.http.post(`${this.base}/projects/${projectId}/tasks`, payload);
  }
  update(taskId: string, payload: UpdateTaskRequest) {
    return this.http.put(`${this.base}/tasks/${taskId}`, payload);
  }
  updateStatus(taskId: string, status: TaskStatus) {
    return this.http.patch(`${this.base}/tasks/${taskId}/status`, { status });
  }
  delete(taskId: string) {
    return this.http.delete(`${this.base}/tasks/${taskId}`);
  }
  statusBadge(s: TaskStatus) {
    switch (s) {
      case 'NEW': return 'badge bg-secondary';
      case 'IN_PROGRESS': return 'badge bg-primary';
      case 'BLOCKED': return 'badge bg-danger';
      case 'COMPLETED': return 'badge bg-success';
      case 'CANCELLED': return 'badge bg-dark';
      default: return 'badge bg-secondary';
    }
  }

  statusLabel(s: TaskStatus) {
    switch (s) {
      case 'NEW': return 'New';
      case 'IN_PROGRESS': return 'In Progress';
      case 'BLOCKED': return 'Blocked';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return 'Unknown';
    }
  }
}
