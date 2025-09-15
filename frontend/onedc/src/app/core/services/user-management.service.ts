import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export enum UserRole {
  EMPLOYEE = 0,
  APPROVER = 1,
  ADMIN = 2
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/users`;

  // Get all users
  getUsers(): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(this.apiUrl);
  }

  // Get user by ID
  getUserById(userId: string): Observable<AppUser> {
    return this.http.get<AppUser>(`${this.apiUrl}/${userId}`);
  }

  // Create new user
  createUser(request: CreateUserRequest): Observable<AppUser> {
    return this.http.post<AppUser>(this.apiUrl, request);
  }

  // Update user
  updateUser(userId: string, request: UpdateUserRequest): Observable<AppUser> {
    return this.http.put<AppUser>(`${this.apiUrl}/${userId}`, request);
  }

  // Activate/Deactivate user
  toggleUserStatus(userId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${userId}/toggle-status`, {});
  }

  // Delete user (soft delete by setting isActive to false)
  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}`);
  }

  // Get user roles for dropdown
  getUserRoles(): { value: UserRole; label: string }[] {
    return [
      { value: UserRole.EMPLOYEE, label: 'Employee' },
      { value: UserRole.APPROVER, label: 'Approver' },
      { value: UserRole.ADMIN, label: 'Admin' }
    ];
  }

  // Get role display name
  getRoleDisplayName(role: UserRole): string {
    switch (role) {
      case UserRole.EMPLOYEE:
        return 'Employee';
      case UserRole.APPROVER:
        return 'Approver';
      case UserRole.ADMIN:
        return 'Admin';
      default:
        return 'Unknown';
    }
  }
}
