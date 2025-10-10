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
    <!-- Main Container with Bootstrap Background -->
    <div class="min-vh-100 bg-light d-flex align-items-center justify-content-center py-5">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-6 col-md-8 col-sm-10">
            
            <!-- Main Card with Shadow and Rounded Corners -->
            <div class="card border-0 shadow-lg">
              
              <!-- Header Section with Brand Colors -->
              <div class="card-header bg-success text-white text-center py-4 border-0">
                <div class="mb-3">
                  <i class="fas fa-key fs-3 mb-2"></i>
                </div>
                <h3 class="card-title mb-2 fw-bold">Reset Password</h3>
                <p class="card-text mb-0 opacity-90 small">
                  Enter the 6-digit OTP sent to <strong>{{ email }}</strong> and your new password.
                </p>
              </div>

              <!-- Form Section -->
              <div class="card-body p-5">
                <form novalidate>
                  
                  <!-- OTP Input Group -->
                  <div class="mb-4">
                    <label for="otp" class="form-label fw-semibold text-dark small">
                      <i class="fas fa-shield-alt me-2 text-success"></i>6-Digit OTP
                    </label>
                    <div class="input-group">
                      <span class="input-group-text bg-light border-end-0">
                        <i class="fas fa-lock text-muted small"></i>
                      </span>
                      <input
                        id="otp"
                        name="otp"
                        type="text"
                        [(ngModel)]="otp"
                        maxlength="6"
                        pattern="[0-9]{6}"
                        required
                        class="form-control border-start-0 ps-2 text-center fw-bold tracking-wider"
                        [class.is-invalid]="submitted && otp.length !== 6"
                        placeholder="000000"
                        [disabled]="loading()"
                        (input)="onOtpInput($event)"
                        style="letter-spacing: 0.2em; font-size: 1.1em;"
                      />
                    </div>
                    
                    <!-- OTP Validation Feedback -->
                    <div *ngIf="submitted && otp.length !== 6" class="invalid-feedback d-block">
                      <i class="fas fa-exclamation-triangle me-1"></i>
                      <small>Please enter a valid 6-digit OTP</small>
                    </div>
                  </div>

                  <!-- New Password Input Group -->
                  <div class="mb-4">
                    <label for="newPassword" class="form-label fw-semibold text-dark small">
                      <i class="fas fa-lock me-2 text-success"></i>New Password
                    </label>
                    <div class="input-group">
                      <span class="input-group-text bg-light border-end-0">
                        <i class="fas fa-key text-muted small"></i>
                      </span>
                      <input
                        id="newPassword"
                        name="newPassword"
                        [type]="showPassword ? 'text' : 'password'"
                        [(ngModel)]="newPassword"
                        required
                        minlength="8"
                        class="form-control border-start-0 border-end-0 ps-2"
                        [class.is-invalid]="submitted && (!newPassword || newPassword.length < 8)"
                        placeholder="Enter new password"
                        [disabled]="loading()"
                      />
                      <button
                        type="button"
                        class="input-group-text bg-light border-start-0"
                        (click)="showPassword = !showPassword"
                      >
                        <small class="text-primary fw-semibold">{{ showPassword ? 'Hide' : 'Show' }}</small>
                      </button>
                    </div>
                    
                    <!-- Password Validation Feedback -->
                    <div *ngIf="submitted && (!newPassword || newPassword.length < 8)" class="invalid-feedback d-block">
                      <i class="fas fa-exclamation-triangle me-1"></i>
                      <small>Password must be at least 8 characters long</small>
                    </div>
                  </div>

                  <!-- Confirm Password Input Group -->
                  <div class="mb-4">
                    <label for="confirmPassword" class="form-label fw-semibold text-dark small">
                      <i class="fas fa-check-circle me-2 text-success"></i>Confirm New Password
                    </label>
                    <div class="input-group">
                      <span class="input-group-text bg-light border-end-0">
                        <i class="fas fa-check text-muted small"></i>
                      </span>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        [type]="showPassword ? 'text' : 'password'"
                        [(ngModel)]="confirmPassword"
                        required
                        class="form-control border-start-0 ps-2"
                        [class.is-invalid]="submitted && (newPassword !== confirmPassword)"
                        placeholder="Confirm new password"
                        [disabled]="loading()"
                      />
                    </div>
                    
                    <!-- Confirm Password Validation Feedback -->
                    <div *ngIf="submitted && newPassword && confirmPassword && newPassword !== confirmPassword" class="invalid-feedback d-block">
                      <i class="fas fa-exclamation-triangle me-1"></i>
                      <small>Passwords do not match</small>
                    </div>
                  </div>

                  <!-- Password Requirements -->
                  <div class="alert alert-info border-0 bg-light-info mb-4">
                    <div class="d-flex align-items-start">
                      <i class="fas fa-info-circle text-info me-2 mt-1"></i>
                      <div>
                        <small class="text-muted">
                          <strong>Password Requirements:</strong><br>
                          • Minimum 8 characters<br>
                          • Use a mix of letters, numbers and symbols for better security
                        </small>
                      </div>
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div class="row g-3 mb-4">
                    <!-- Reset Password Button -->
                    <div class="col-12">
                      <button
                        type="button"
                        (click)="onSubmit()"
                        [disabled]="loading() || !isFormValid()"
                        class="btn btn-success w-100 py-2 fw-semibold position-relative"
                      >
                        <span *ngIf="!loading()">
                          <i class="fas fa-check me-2 small"></i>Reset Password
                        </span>
                        <span *ngIf="loading()">
                          <span class="spinner-border spinner-border-sm me-2" role="status">
                            <span class="visually-hidden">Loading...</span>
                          </span>
                          Resetting Password...
                        </span>
                      </button>
                    </div>

                    <!-- Resend OTP Button -->
                    <div class="col-12">
                      <button
                        type="button"
                        (click)="resendOtp()"
                        [disabled]="resendLoading() || resendCooldown() > 0"
                        class="btn btn-outline-primary w-100 py-2 fw-semibold"
                      >
                        <span *ngIf="!resendLoading() && resendCooldown() === 0">
                          <i class="fas fa-redo me-2 small"></i>Resend OTP
                        </span>
                        <span *ngIf="resendLoading()">
                          <span class="spinner-border spinner-border-sm me-2" role="status">
                            <span class="visually-hidden">Loading...</span>
                          </span>
                          Sending OTP...
                        </span>
                        <span *ngIf="!resendLoading() && resendCooldown() > 0">
                          <i class="fas fa-clock me-2 small"></i>Resend OTP ({{ resendCooldown() }}s)
                        </span>
                      </button>
                    </div>
                  </div>

                </form>
              </div>

              <!-- Footer Section with Navigation -->
              <div class="card-footer bg-light text-center py-3 border-0">
                <div class="row align-items-center">
                  <div class="col">
                    <a 
                      routerLink="/login" 
                      class="btn btn-outline-secondary btn-sm px-3"
                    >
                      <i class="fas fa-arrow-left me-1 small"></i>Back to Login
                    </a>
                  </div>
                </div>
              </div>

            </div>

            <!-- Help Section -->
            <div class="text-center mt-3">
              <div class="card border-0 bg-transparent">
                <div class="card-body py-2">
                  <p class="text-muted mb-1">
                    <small>Still having trouble accessing your account?</small>
                  </p>
                  <a 
                    href="mailto:support@onedc.com" 
                    class="btn btn-link btn-sm text-decoration-none p-0"
                  >
                    <i class="fas fa-headset me-1 small"></i>Contact Support
                  </a>
                </div>
              </div>
            </div>

            <!-- Brand Footer -->
            <div class="text-center mt-2">
              <small class="text-muted" style="font-size: 0.75rem;">
                © 2025 OneDC. Secure password recovery system.
              </small>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- Custom Styles -->
    <style>
      .bg-light-info {
        background-color: #e7f3ff !important;
      }
      
      .input-group-text {
        background-color: #f8f9fa;
        border-color: #dee2e6;
      }
      
      .form-control:focus {
        border-color: #198754;
        box-shadow: 0 0 0 0.25rem rgba(25, 135, 84, 0.25);
      }
      
      .btn-success {
        background: linear-gradient(45deg, #198754, #146c43);
        border: none;
        transition: all 0.3s ease;
      }
      
      .btn-success:hover {
        background: linear-gradient(45deg, #146c43, #0f5132);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(25, 135, 84, 0.3);
      }
      
      .btn-outline-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(13, 110, 253, 0.2);
      }
      
      .card {
        border-radius: 1rem;
        overflow: hidden;
      }
      
      .card-header {
        background: linear-gradient(135deg, #198754, #20c997) !important;
      }
      
      .min-vh-100 {
        min-height: 100vh;
      }
      
      .tracking-wider {
        letter-spacing: 0.1em;
      }
      
      @media (max-width: 576px) {
        .card-body {
          padding: 2rem !important;
        }
        
        .card-header {
          padding: 2rem 1rem !important;
        }
        
        .col-12 {
          margin-bottom: 0.5rem;
        }
      }
    </style>
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
