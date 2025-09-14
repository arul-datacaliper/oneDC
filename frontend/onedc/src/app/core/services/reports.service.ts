
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/reports`;

  utilization(from: string, to: string, groupBy: 'user'|'project'|'user_project' = 'project') {
    return this.http.get<any[]>(`${this.base}/utilization?from=${from}&to=${to}&groupBy=${groupBy}`);
  }
}
