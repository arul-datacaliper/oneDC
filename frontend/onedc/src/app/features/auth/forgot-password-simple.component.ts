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
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div class="w-full max-w-md mx-auto">
        <!-- Main Card -->
        <div class="bg-white rounded-2xl shadow-lg border border-gray-200">
          <!-- Header Section -->
          <div class="px-8 pt-10 pb-6 text-center">
            <h1 class="text-2xl font-bold text-gray-900 mb-3">Forgot Password?</h1>
            <p class="text-gray-600 text-sm leading-relaxed">
              No worries! Enter your email address and we'll send you an OTP to reset your password.
            </p>
          </div>

          <!-- Form Section -->
          <div class="px-8 py-6">
            <form class="space-y-6" (ngSubmit)="onSubmit()">
              <div class="space-y-2">
                <label for="email" class="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  [(ngModel)]="email"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all duration-200 text-sm"
                  placeholder="Enter your email address"
                  [disabled]="loading()"
                />
                @if (submitted && !email) {
                  <div class="text-red-600 text-sm pt-1">
                    Email address is required
                  </div>
                }
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                [disabled]="loading()"
                class="w-full py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                @if (loading()) {
                  <span>Sending OTP...</span>
                } @else {
                  <span>Send Reset OTP</span>
                }
              </button>
            </form>
          </div>

          <!-- Footer -->
          <div class="px-8 py-6 bg-gray-50 border-t border-gray-100">
            <div class="text-center">
              <a 
                routerLink="/login" 
                class="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200"
              >
                ← Back to login
              </a>
            </div>
          </div>
        </div>

        <!-- Additional Help -->
        <div class="mt-6 text-center">
          <p class="text-xs text-gray-500">
            Having trouble? 
            <a href="mailto:support@onedc.com" class="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200">
              Contact support
            </a>
          </p>
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
