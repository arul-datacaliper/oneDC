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
}
