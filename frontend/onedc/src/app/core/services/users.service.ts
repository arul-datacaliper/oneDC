import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type UserRole = 'EMPLOYEE' | 'APPROVER' | 'ADMIN';

export interface AppUser { 
  userId: string; 
  email: string; 
  firstName: string; 
  lastName: string; 
  isActive: boolean; 
  role: UserRole;
  jobTitle?: string;
  department?: string;
}


@Injectable({
  providedIn: 'root'
})
export class UsersService {
   private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/users`; // <-- adjust to your actual endpoint
  list(activeOnly = true) {
    const params = new HttpParams().set('activeOnly', String(activeOnly));
    return this.http.get<AppUser[]>(this.base, { params });
  }
}
