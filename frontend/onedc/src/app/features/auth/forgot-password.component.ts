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
    <!-- Main Container with Bootstrap Background -->
    <div class="min-vh-100 bg-light d-flex align-items-center justify-content-center py-5">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-5 col-md-7 col-sm-9">
            
            <!-- Main Card with Shadow and Rounded Corners -->
            <div class="card border-0 shadow-lg">
              
              <!-- Header Section with Brand Colors -->
              <div class="card-header bg-primary text-white text-center py-4 border-0">
                <div class="mb-3">
                  <i class="fas fa-lock fs-3 mb-2"></i>
                </div>
                <h3 class="card-title mb-2 fw-bold">Forgot Password?</h3>
                <p class="card-text mb-0 opacity-90 small">
                  No worries! Enter your email address and we'll send you an OTP to reset your password.
                </p>
              </div>

              <!-- Form Section -->
              <div class="card-body p-5">
                <form (ngSubmit)="onSubmit()" novalidate>
                  
                  <!-- Email Input Group -->
                  <div class="mb-4">
                    <label for="email" class="form-label fw-semibold text-dark small">
                      <i class="fas fa-envelope me-2 text-primary"></i>Email Address
                    </label>
                    <div class="input-group">
                      <span class="input-group-text bg-light border-end-0">
                        <i class="fas fa-envelope text-muted small"></i>
                      </span>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        [(ngModel)]="email"
                        required
                        class="form-control border-start-0 ps-2"
                        [class.is-invalid]="submitted && !email"
                        placeholder="Enter your email address"
                        [disabled]="loading()"
                        autocomplete="email"
                      />
                    </div>
                    
                    <!-- Email Validation Feedback -->
                    <div *ngIf="submitted && !email" class="invalid-feedback d-block">
                      <i class="fas fa-exclamation-triangle me-1"></i>
                      <small>Email address is required</small>
                    </div>
                  </div>

                  <!-- Submit Button with Loading State -->
                  <div class="d-grid mb-4">
                    <button
                      type="submit"
                      [disabled]="loading()"
                      class="btn btn-primary py-2 fw-semibold position-relative"
                    >
                      <span *ngIf="!loading()">
                        <i class="fas fa-paper-plane me-2 small"></i>Send Reset OTP
                      </span>
                      <span *ngIf="loading()">
                        <span class="spinner-border spinner-border-sm me-2" role="status">
                          <span class="visually-hidden">Loading...</span>
                        </span>
                        Sending OTP...
                      </span>
                    </button>
                  </div>

                  <!-- Security Notice -->
                  <div class="alert alert-info border-0 bg-light-info">
                    <div class="d-flex align-items-center">
                      <i class="fas fa-info-circle text-info me-2"></i>
                      <div>
                        <small class="text-muted">
                          <strong>Security Notice:</strong> The OTP will be valid for 15 minutes only.
                          Please check your email and spam folder.
                        </small>
                      </div>
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
        border-color: #0d6efd;
        box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
      }
      
      .btn-primary {
        background: linear-gradient(45deg, #0d6efd, #0a58ca);
        border: none;
        transition: all 0.3s ease;
      }
      
      .btn-primary:hover {
        background: linear-gradient(45deg, #0a58ca, #084298);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(13, 110, 253, 0.3);
      }
      
      .card {
        border-radius: 1rem;
        overflow: hidden;
      }
      
      .card-header {
        background: linear-gradient(135deg, #0d6efd, #6f42c1) !important;
      }
      
      .min-vh-100 {
        min-height: 100vh;
      }
      
      @media (max-width: 576px) {
        .card-body {
          padding: 2rem !important;
        }
        
        .card-header {
          padding: 2rem 1rem !important;
        }
      }
    </style>
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
