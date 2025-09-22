import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Holiday {
  holidayDate: string; // YYYY-MM-DD format
  name: string;
  region: string;
}

export interface CreateHolidayRequest {
  holidayDate: string;
  name: string;
  region?: string;
}

export interface BulkCreateHolidaysRequest {
  holidays: CreateHolidayRequest[];
}

@Injectable({
  providedIn: 'root'
})
export class HolidayService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiBaseUrl}/holidays`;

  getHolidays(from?: string, to?: string, region?: string): Observable<Holiday[]> {
    const params: any = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (region) params.region = region;

    return this.http.get<Holiday[]>(this.baseUrl, { params });
  }

  createHoliday(holiday: CreateHolidayRequest): Observable<Holiday> {
    return this.http.post<Holiday>(this.baseUrl, {
      holidayDate: holiday.holidayDate,
      name: holiday.name,
      region: holiday.region || 'IN'
    });
  }

  updateHoliday(date: string, holiday: CreateHolidayRequest): Observable<Holiday> {
    return this.http.put<Holiday>(`${this.baseUrl}/${date}`, {
      holidayDate: holiday.holidayDate,
      name: holiday.name,
      region: holiday.region || 'IN'
    });
  }

  deleteHoliday(date: string, region?: string): Observable<void> {
    const params: any = {};
    if (region) params.region = region;
    
    return this.http.delete<void>(`${this.baseUrl}/${date}`, { params });
  }

  bulkCreateHolidays(holidays: CreateHolidayRequest[]): Observable<{ message: string; count: number }> {
    return this.http.post<{ message: string; count: number }>(`${this.baseUrl}/bulk`, holidays);
  }

  // Utility method to get current year holidays
  getCurrentYearHolidays(): Observable<Holiday[]> {
    const currentYear = new Date().getFullYear();
    const from = `${currentYear}-01-01`;
    const to = `${currentYear}-12-31`;
    return this.getHolidays(from, to, 'IN');
  }

  // Utility method to check if a date is a holiday
  isHoliday(date: string, holidays: Holiday[]): boolean {
    return holidays.some(h => h.holidayDate === date);
  }

  // Get the name of holiday for a given date
  getHolidayName(date: string, holidays: Holiday[]): string | null {
    const holiday = holidays.find(h => h.holidayDate === date);
    return holiday ? holiday.name : null;
  }
}
