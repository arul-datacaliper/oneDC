import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, BehaviorSubject, tap } from 'rxjs';

export interface AuthResult {
  token: string;
  userId: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/auth`;
  
  private _user = new BehaviorSubject<AuthResult | null>(null);
  public user$ = this._user.asObservable();

  login(request: LoginRequest): Observable<AuthResult> {
    return this.http.post<AuthResult>(`${this.base}/login`, request).pipe(
      tap(result => {
        localStorage.setItem('auth_token', result.token);
        this._user.next(result);
      })
    );
  }

  logout() {
    localStorage.removeItem('auth_token');
    this._user.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): AuthResult | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      // Decode JWT token to get user info
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        token: token,
        userId: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.sub,
        email: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || payload.email,
        name: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.name,
        role: payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    console.log('Checking if user is admin:', user);
    const isAdmin = user?.role === 'ADMIN';
    console.log('User role:', user?.role, 'Is admin:', isAdmin);
    return isAdmin;
  }

  isApprover(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'APPROVER';
  }

  canApprove(): boolean {
    return this.isAdmin() || this.isApprover();
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }
}
