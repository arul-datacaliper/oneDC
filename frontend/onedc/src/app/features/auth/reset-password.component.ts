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
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <div>
          <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
            <svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Password
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Enter the 6-digit OTP sent to {{ email }} and your new password.
          </p>
        </div>
        
        <div class="mt-8 space-y-6">
          <div class="space-y-4">
            <!-- OTP Input -->
            <div>
              <label for="otp" class="block text-sm font-medium text-gray-700">
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
                class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center text-2xl tracking-widest"
                placeholder="000000"
                [disabled]="loading()"
                (input)="onOtpInput($event)"
              />
            </div>

            <!-- New Password -->
            <div>
              <label for="newPassword" class="block text-sm font-medium text-gray-700">
                New Password
              </label>
              <div class="mt-1 relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  [type]="showPassword ? 'text' : 'password'"
                  [(ngModel)]="newPassword"
                  required
                  minlength="8"
                  class="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter new password"
                  [disabled]="loading()"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center"
                  (click)="showPassword = !showPassword"
                >
                  <svg
                    class="h-5 w-5 text-gray-400"
                    [attr.fill]="showPassword ? 'currentColor' : 'none'"
                    [attr.stroke]="showPassword ? 'none' : 'currentColor'"
                    viewBox="0 0 24 24"
                  >
                    @if (showPassword) {
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    } @else {
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <!-- Confirm Password -->
            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                [type]="showPassword ? 'text' : 'password'"
                [(ngModel)]="confirmPassword"
                required
                class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm new password"
                [disabled]="loading()"
              />
            </div>
          </div>

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

          <!-- Buttons -->
          <div class="space-y-3">
            <button
              type="submit"
              (click)="onSubmit()"
              [disabled]="loading() || !isFormValid()"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (loading()) {
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              }
              Reset Password
            </button>

            <button
              type="button"
              (click)="resendOtp()"
              [disabled]="resendLoading() || resendCooldown() > 0"
              class="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (resendLoading()) {
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
              }
              @if (resendCooldown() > 0) {
                Resend OTP ({{ resendCooldown() }}s)
              } @else {
                Resend OTP
              }
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
