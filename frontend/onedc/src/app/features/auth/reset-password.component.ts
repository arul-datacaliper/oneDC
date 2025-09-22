import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div class="w-full max-w-md mx-auto">
        <!-- Main Card -->
        <div class="bg-white rounded-2xl shadow-lg border border-gray-200">
          <!-- Header Section -->
          <div class="px-8 pt-10 pb-6 text-center">
            <h1 class="text-2xl font-bold text-gray-900 mb-3">Reset Password</h1>
            <p class="text-gray-600 text-sm leading-relaxed">
              Enter the 6-digit OTP sent to {{ email }} and your new password.
            </p>
          </div>

          <!-- Form Section -->
          <div class="px-8 py-6">
            <div class="space-y-6">
              <!-- OTP Input -->
              <div>
                <label for="otp" class="block text-sm font-medium text-gray-700 mb-2">
                  6-Digit OTP
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  [(ngModel)]="otp"
                  maxlength="6"
                  pattern="[0-9]{6}"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all duration-200 text-sm text-center tracking-wider"
                  placeholder="000000"
                  [disabled]="loading()"
                  (input)="onOtpInput($event)"
                />
              </div>

              <!-- New Password -->
              <div>
                <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div class="relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    [type]="showPassword ? 'text' : 'password'"
                    [(ngModel)]="newPassword"
                    required
                    minlength="8"
                    class="w-full px-4 py-3 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all duration-200 text-sm"
                    placeholder="Enter new password"
                    [disabled]="loading()"
                  />
                  <button
                    type="button"
                    class="absolute inset-y-0 right-0 pr-4 flex items-center"
                    (click)="showPassword = !showPassword"
                  >
                    <span class="text-gray-400 text-xs font-medium">{{ showPassword ? 'Hide' : 'Show' }}</span>
                  </button>
                </div>
              </div>

              <!-- Confirm Password -->
              <div>
                <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  [type]="showPassword ? 'text' : 'password'"
                  [(ngModel)]="confirmPassword"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-all duration-200 text-sm"
                  placeholder="Confirm new password"
                  [disabled]="loading()"
                />
              </div>

              <!-- Error Messages -->
              <div class="space-y-2">
                @if (submitted && (!otp || !newPassword || !confirmPassword)) {
                  <div class="text-red-600 text-sm">
                    All fields are required
                  </div>
                }

                @if (submitted && newPassword && confirmPassword && newPassword !== confirmPassword) {
                  <div class="text-red-600 text-sm">
                    Passwords do not match
                  </div>
                }

                @if (submitted && newPassword && newPassword.length < 8) {
                  <div class="text-red-600 text-sm">
                    Password must be at least 8 characters long
                  </div>
                }
              </div>

              <!-- Submit Button -->
              <div class="space-y-4">
                <button
                  type="button"
                  (click)="onSubmit()"
                  [disabled]="loading() || !isFormValid()"
                  class="w-full py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                >
                  @if (loading()) {
                    <span>Resetting Password...</span>
                  } @else {
                    <span>Reset Password</span>
                  }
                </button>

                <!-- Resend OTP Button -->
                <button
                  type="button"
                  (click)="resendOtp()"
                  [disabled]="resendLoading() || resendCooldown() > 0"
                  class="w-full py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
                >
                  @if (resendLoading()) {
                    <span>Sending OTP...</span>
                  } @else if (resendCooldown() > 0) {
                    <span>Resend OTP ({{ resendCooldown() }}s)</span>
                  } @else {
                    <span>Resend OTP</span>
                  }
                </button>
              </div>
            </div>
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
export class ResetPasswordComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);
  private authService = inject(AuthService);

  email = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';
  loading = signal(false);
  resendLoading = signal(false);
  resendCooldown = signal(0);
  submitted = false;
  showPassword = false;

  ngOnInit() {
    // Get email from query params
    this.email = this.route.snapshot.queryParams['email'] || '';
    if (!this.email) {
      this.toastr.error('Email not found. Please start the reset process again.');
      this.router.navigate(['/forgot-password']);
    }
  }

  onOtpInput(event: any) {
    // Only allow numbers
    const value = event.target.value.replace(/[^0-9]/g, '');
    this.otp = value.substring(0, 6);
    event.target.value = this.otp;
  }

  isFormValid(): boolean {
    return this.otp.length === 6 && 
           this.newPassword.length >= 8 && 
           this.newPassword === this.confirmPassword;
  }

  onSubmit() {
    this.submitted = true;
    
    if (!this.isFormValid()) {
      this.toastr.warning('Please fill all fields correctly');
      return;
    }

    this.loading.set(true);
    
    this.authService.resetPassword({ 
      email: this.email, 
      otp: this.otp, 
      newPassword: this.newPassword 
    }).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.toastr.success(response.message);
        this.router.navigate(['/login'], {
          queryParams: { message: 'Password reset successfully. Please login with your new password.' }
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.toastr.error(err.error?.message || 'Failed to reset password');
      }
    });
  }

  resendOtp() {
    if (this.resendCooldown() > 0) return;

    this.resendLoading.set(true);
    
    this.authService.resendOtp({ email: this.email }).subscribe({
      next: (response) => {
        this.resendLoading.set(false);
        this.toastr.success(response.message);
        this.startResendCooldown();
      },
      error: (err) => {
        this.resendLoading.set(false);
        this.toastr.error(err.error?.message || 'Failed to resend OTP');
      }
    });
  }

  private startResendCooldown() {
    this.resendCooldown.set(60); // 60 seconds cooldown
    const interval = setInterval(() => {
      const current = this.resendCooldown() - 1;
      this.resendCooldown.set(current);
      if (current <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  }
}
