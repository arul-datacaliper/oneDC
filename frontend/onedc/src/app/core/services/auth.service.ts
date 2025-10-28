import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, BehaviorSubject, tap, map } from 'rxjs';

export interface AuthResult {
  token: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Forgot Password Interfaces
export interface ForgotPasswordRequest {
  email: string;
}

export interface ValidateOtpRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ResendOtpRequest {
  email: string;
}

export interface ApiResponse {
  message: string;
  isValid?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/auth`;
  
  private _user = new BehaviorSubject<AuthResult | null>(null);
  public user$ = this._user.asObservable();
  
  // Track onboarding completion status
  private _onboardingComplete = new BehaviorSubject<boolean>(false);
  public onboardingComplete$ = this._onboardingComplete.asObservable();

  login(request: LoginRequest): Observable<AuthResult> {
    return this.http.post<AuthResult>(`${this.base}/login`, request).pipe(
      tap(result => {
        localStorage.setItem('auth_token', result.token);
        this._user.next(result);
        // Check onboarding status after successful login
        this.checkOnboardingStatus();
      })
    );
  }

  logout(): void {
    try {
      // Optionally call backend logout endpoint for logging/security
      const token = this.getToken();
      if (token) {
        // Call backend logout (don't wait for response to avoid delays)
        this.http.post(`${this.base}/logout`, {}).subscribe({
          next: () => console.log('Backend logout successful'),
          error: (error) => console.warn('Backend logout failed:', error)
        });
      }
      
      // Clear all authentication-related data from localStorage immediately
      localStorage.removeItem('auth_token');
      localStorage.removeItem('onboarding_complete');
      
      // Clear any other app-specific data that should be removed on logout
      // (Add more items here if needed in the future)
      
      // Reset all observables to their default states
      this._user.next(null);
      this._onboardingComplete.next(false);
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Ensure cleanup happens even if there's an error
      localStorage.removeItem('auth_token');
      localStorage.removeItem('onboarding_complete');
      this._user.next(null);
      this._onboardingComplete.next(false);
    }
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    // Basic validation - check if it looks like a JWT
    const parts = token.split('.');
    if (parts.length !== 3) {
      this.logout(); // Clear invalid token
      return false;
    }
    
    try {
      // Try to decode and check expiration
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp < Date.now() / 1000) {
        this.logout(); // Clear expired token
        return false;
      }
      return true;
    } catch (error) {
      this.logout(); // Clear malformed token
      return false;
    }
  }

  getCurrentUser(): AuthResult | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      // Validate JWT token format (should have 3 parts separated by dots)
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Invalid JWT token format');
        this.logout(); // Clear invalid token
        return null;
      }

      // Decode JWT token payload (second part)
      const payload = JSON.parse(atob(tokenParts[1]));
      
      // Check if token is expired
      if (payload.exp && payload.exp < Date.now() / 1000) {
        console.error('JWT token has expired');
        this.logout(); // Clear expired token
        return null;
      }

      return {
        token: token,
        userId: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || payload.sub || payload.userId,
        email: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || payload.email,
        name: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.name,
        role: payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role,
        mustChangePassword: payload.mustChangePassword === 'true' || payload.mustChangePassword === true
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      // Clear invalid token and redirect to login
      this.logout();
      return null;
    }
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    return user.role === 'ADMIN';
  }

  isApprover(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'APPROVER';
  }

  canApprove(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'ADMIN' || user?.role === 'APPROVER';
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  // Onboarding status methods
  async checkOnboardingStatus(): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) {
      this._onboardingComplete.next(false);
      localStorage.setItem('onboarding_complete', 'false');
      return;
    }

    // Admin users don't need onboarding - consider them as completed
    if (user.role === 'ADMIN') {
      this._onboardingComplete.next(true);
      localStorage.setItem('onboarding_complete', 'true');
      return;
    }

    try {
      // Check onboarding status from the API for non-admin users
      const response = await this.http.get<any>(`${environment.apiBaseUrl}/onboarding/profile/${user.userId}`).toPromise();
      const isComplete = response?.isOnboardingComplete || false;
      this._onboardingComplete.next(isComplete);
      
      // Store in localStorage for persistence
      localStorage.setItem('onboarding_complete', isComplete.toString());
    } catch (error) {
      console.log('Profile not found or error checking onboarding status:', error);
      // If profile doesn't exist or there's an error, onboarding is not complete
      this._onboardingComplete.next(false);
      localStorage.setItem('onboarding_complete', 'false');
    }
  }

  isOnboardingComplete(): boolean {
    // Check from BehaviorSubject first, fallback to localStorage
    const currentValue = this._onboardingComplete.getValue();
    if (currentValue !== null) return currentValue;
    
    const stored = localStorage.getItem('onboarding_complete');
    return stored === 'true';
  }

  markOnboardingComplete(): void {
    this._onboardingComplete.next(true);
    localStorage.setItem('onboarding_complete', 'true');
  }

  // Initialize onboarding status on app start
  initializeOnboardingStatus(): void {
    if (this.isAuthenticated()) {
      this.checkOnboardingStatus();
    }
  }

  // Debug method to help troubleshoot token issues
  debugToken(): void {
    const token = this.getToken();
    console.log('=== Token Debug Info ===');
    console.log('Token exists:', !!token);
    if (token) {
      console.log('Token length:', token.length);
      console.log('Token parts:', token.split('.').length);
      console.log('Token starts with:', token.substring(0, 20) + '...');
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const header = JSON.parse(atob(parts[0]));
          const payload = JSON.parse(atob(parts[1]));
          console.log('Header:', header);
          console.log('Payload:', payload);
          console.log('Expires:', new Date(payload.exp * 1000));
        }
      } catch (e) {
        console.log('Error decoding token for debug:', e);
      }
    }
    console.log('Current user:', this.getCurrentUser());
    console.log('========================');
  }

  // Forgot Password Methods
  forgotPassword(request: ForgotPasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${environment.apiBaseUrl}/PasswordReset/forgot-password`, request);
  }

  validateOtp(request: ValidateOtpRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${environment.apiBaseUrl}/PasswordReset/validate-otp`, request);
  }

  resetPassword(request: ResetPasswordRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${environment.apiBaseUrl}/PasswordReset/reset-password`, request);
  }

  resendOtp(request: ResendOtpRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${environment.apiBaseUrl}/PasswordReset/resend-otp`, request);
  }

  // Refresh the current user's token (useful when role changes)
  refreshToken(): Observable<AuthResult> {
    return this.http.post<AuthResult>(`${this.base}/refresh-token`, {}).pipe(
      tap(result => {
        if (result && result.token) {
          localStorage.setItem('auth_token', result.token);
          this._user.next(result);
          // Re-check onboarding status with new role
          this.checkOnboardingStatus();
        }
      })
    );
  }

  // New password change methods
  setInitialPassword(newPassword: string): Observable<{ message: string; token?: string; mustChangePassword?: boolean }> {
    return this.http.post<{ message: string; token?: string; mustChangePassword?: boolean }>(`${this.base}/set-initial-password`, { newPassword }).pipe(
      tap(result => {
        // Update token with new one that has mustChangePassword = false
        if (result.token) {
          localStorage.setItem('auth_token', result.token);
          // Update user state with the new token
          const updatedUser = this.getCurrentUser();
          if (updatedUser) {
            updatedUser.mustChangePassword = false;
            this._user.next(updatedUser);
          }
        }
      })
    );
  }

  // Check if user must change password by calling backend
  checkMustChangePassword(): Observable<{ mustChangePassword: boolean }> {
    return this.http.get<any>(`${this.base}/me`).pipe(
      map((response: any) => ({ mustChangePassword: response.mustChangePassword || false }))
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.base}/change-password`, { 
      currentPassword, 
      newPassword 
    });
  }
}
