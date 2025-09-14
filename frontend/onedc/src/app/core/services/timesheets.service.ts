import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TimesheetEntry } from '../../shared/models';
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
  create(body: { projectId: string; workDate: string; hours: number; description?: string; ticketRef?: string; }) {
    return this.http.post<TimesheetEntry>(this.base, body);
  }
  update(id: string, body: { hours: number; description?: string; ticketRef?: string; }) {
    return this.http.put<TimesheetEntry>(`${this.base}/${id}`, body);
  }
  submit(id: string) {
    return this.http.post<TimesheetEntry>(`${this.base}/${id}/submit`, {});
  }
}
