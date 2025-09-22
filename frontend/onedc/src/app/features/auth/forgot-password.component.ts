import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <div>
          <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Forgot Password
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you an OTP to reset your password.
          </p>
        </div>
        
        <div class="mt-8 space-y-6">
          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label for="email" class="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                [(ngModel)]="email"
                required
                class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                [disabled]="loading()"
              />
            </div>
          </div>

          @if (submitted && !email) {
            <div class="text-red-600 text-sm">
              Email address is required
            </div>
          }

          <div>
            <button
              type="submit"
              (click)="onSubmit()"
              [disabled]="loading()"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (loading()) {
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              }
              Send Reset OTP
            </button>
          </div>

          <div class="text-center">
            <a routerLink="/login" class="font-medium text-blue-600 hover:text-blue-500">
              ← Back to login
            </a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private authService = inject(AuthService);

  email = '';
  loading = signal(false);
  submitted = false;

  onSubmit() {
    this.submitted = true;
    
    if (!this.email) {
      this.toastr.warning('Please enter your email address');
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.toastr.warning('Please enter a valid email address');
      return;
    }

    this.loading.set(true);
    
    this.authService.forgotPassword({ email: this.email }).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.toastr.success(response.message);
        // Navigate to OTP verification with email
        this.router.navigate(['/reset-password'], { 
          queryParams: { email: this.email } 
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.toastr.error(err.error?.message || 'Failed to send reset OTP');
      }
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
