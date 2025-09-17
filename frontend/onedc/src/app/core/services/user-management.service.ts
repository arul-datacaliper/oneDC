import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AppUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole | string; // Allow both enum and string values
  isActive: boolean;
  createdAt: string;
  managerId?: string;
  managerName?: string;
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
  managerId?: string;
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

  // Get users with specific role
  getUsersByRole(role: UserRole): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(`${this.apiUrl}/by-role/${role}`);
  }

  // Get approvers only
  getApprovers(): Observable<AppUser[]> {
    return this.getUsersByRole(UserRole.APPROVER);
  }

  // Get potential managers (Approvers and Admins)
  getManagers(): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(`${this.apiUrl}`).pipe(
      map((users: AppUser[]) => {
        const managers = users.filter((user: AppUser) => {
          // Convert string role to enum value for comparison
          let userRoleValue: UserRole;
          if (typeof user.role === 'string') {
            switch (user.role.toUpperCase()) {
              case 'EMPLOYEE':
                userRoleValue = UserRole.EMPLOYEE;
                break;
              case 'APPROVER':
                userRoleValue = UserRole.APPROVER;
                break;
              case 'ADMIN':
                userRoleValue = UserRole.ADMIN;
                break;
              default:
                userRoleValue = UserRole.EMPLOYEE;
            }
          } else {
            userRoleValue = user.role;
          }
          
          return userRoleValue === UserRole.APPROVER || userRoleValue === UserRole.ADMIN;
        });
        return managers;
      })
    );
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
