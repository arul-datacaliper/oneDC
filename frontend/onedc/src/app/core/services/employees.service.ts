import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Employee } from '../../shared/models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmployeesService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/employees`; // Back to /employees

  getAll(status: string = 'active') {
    return this.http.get<Employee[]>(`${this.base}?status=${status}`);
  }

  getCounts() {
    return this.http.get<{ active: number; inactive: number; total: number }>(`${this.base}/counts`);
  }

  reactivate(id: string) {
    return this.http.put(`${this.base}/${id}/reactivate`, {});
  }

  getById(id: string) {
    return this.http.get<Employee>(`${this.base}/${id}`);
  }

  create(employee: Partial<Employee>) {
    return this.http.post<Employee>(this.base, employee);
  }

  update(id: string, employee: Partial<Employee>) {
    return this.http.put<Employee>(`${this.base}/${id}`, employee);
  }

  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }

  checkEmployeeIdExists(employeeId: string) {
    return this.http.get<{ exists: boolean }>(`${this.base}/check-employee-id/${encodeURIComponent(employeeId)}`);
  }

  getDashboardMetrics(userId: string) {
    return this.http.get(`${environment.apiBaseUrl}/employees/${userId}/dashboard-metrics`);
  }

  getAssignedTasks(userId: string) {
    return this.http.get(`${environment.apiBaseUrl}/employees/${userId}/tasks`);
  }
}
