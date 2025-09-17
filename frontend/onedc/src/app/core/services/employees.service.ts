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

  getAll() {
    return this.http.get<Employee[]>(this.base);
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

  getDashboardMetrics(userId: string) {
    return this.http.get(`${environment.apiBaseUrl}/employees/${userId}/dashboard-metrics`);
  }

  getAssignedTasks(userId: string) {
    return this.http.get(`${environment.apiBaseUrl}/employees/${userId}/tasks`);
  }
}
