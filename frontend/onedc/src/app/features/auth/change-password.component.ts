import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-change-password',
  imports: [CommonModule, FormsModule],
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
                  <i class="fas fa-key fa-3x opacity-75"></i>
                </div>
                <h4 class="mb-2 fw-bold">Change Password</h4>
                <p class="mb-0 opacity-90">
                  For security purposes, please set a new password
                </p>
              </div>
              
              <!-- Main Form Section -->
              <div class="card-body p-5">
                <form (ngSubmit)="onSubmit()" novalidate>
                  
                  <!-- Current Password Field (only if not initial setup) -->
                  <div class="mb-4" *ngIf="!isInitialSetup()">
                    <label for="currentPassword" class="form-label fw-semibold text-dark mb-2">
                      <i class="fas fa-lock me-2 text-muted"></i>
                      Current Password
                    </label>
                    <div class="input-group">
                      <span class="input-group-text bg-light border-end-0">
                        <i class="fas fa-key text-muted small"></i>
                      </span>
                      <input
                        id="currentPassword"
                        name="currentPassword"
                        [type]="showCurrentPassword ? 'text' : 'password'"
                        [(ngModel)]="currentPassword"
                        required
                        class="form-control border-start-0 border-end-0 ps-2"
                        [class.is-invalid]="submitted && !currentPassword"
                        placeholder="Enter current password"
                        [disabled]="loading()"
                      />
                      <button
                        type="button"
                        class="input-group-text bg-light border-start-0"
                        (click)="showCurrentPassword = !showCurrentPassword"
                      >
                        <small class="text-primary fw-semibold">{{ showCurrentPassword ? 'Hide' : 'Show' }}</small>
                      </button>
                    </div>
                    
                    <!-- Current Password Validation Feedback -->
                    <div *ngIf="submitted && !currentPassword" class="invalid-feedback d-block">
                      <i class="fas fa-exclamation-triangle me-1"></i>
                      <small>Current password is required</small>
                    </div>
                  </div>
                  
                  <!-- New Password Field -->
                  <div class="mb-4">
                    <label for="newPassword" class="form-label fw-semibold text-dark mb-2">
                      <i class="fas fa-lock me-2 text-muted"></i>
                      New Password
                    </label>
                    <div class="input-group">
                      <span class="input-group-text bg-light border-end-0">
                        <i class="fas fa-key text-muted small"></i>
                      </span>
                      <input
                        id="newPassword"
                        name="newPassword"
                        [type]="showNewPassword ? 'text' : 'password'"
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
                        (click)="showNewPassword = !showNewPassword"
                      >
                        <small class="text-primary fw-semibold">{{ showNewPassword ? 'Hide' : 'Show' }}</small>
                      </button>
                    </div>
                    
                    <!-- New Password Validation Feedback -->
                    <div *ngIf="submitted && (!newPassword || newPassword.length < 8)" class="invalid-feedback d-block">
                      <i class="fas fa-exclamation-triangle me-1"></i>
                      <small>Password must be at least 8 characters</small>
                    </div>
                  </div>
                  
                  <!-- Confirm Password Field -->
                  <div class="mb-4">
                    <label for="confirmPassword" class="form-label fw-semibold text-dark mb-2">
                      <i class="fas fa-lock me-2 text-muted"></i>
                      Confirm New Password
                    </label>
                    <div class="input-group">
                      <span class="input-group-text bg-light border-end-0">
                        <i class="fas fa-key text-muted small"></i>
                      </span>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        [type]="showConfirmPassword ? 'text' : 'password'"
                        [(ngModel)]="confirmPassword"
                        required
                        class="form-control border-start-0 border-end-0 ps-2"
                        [class.is-invalid]="submitted && (!confirmPassword || newPassword !== confirmPassword)"
                        placeholder="Confirm new password"
                        [disabled]="loading()"
                      />
                      <button
                        type="button"
                        class="input-group-text bg-light border-start-0"
                        (click)="showConfirmPassword = !showConfirmPassword"
                      >
                        <small class="text-primary fw-semibold">{{ showConfirmPassword ? 'Hide' : 'Show' }}</small>
                      </button>
                    </div>
                    
                    <!-- Confirm Password Validation Feedback -->
                    <div *ngIf="submitted && confirmPassword && newPassword && newPassword !== confirmPassword" class="invalid-feedback d-block">
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
                    <!-- Change Password Button -->
                    <div class="col-12">
                      <button
                        type="submit"
                        [disabled]="loading() || !isFormValid()"
                        class="btn btn-primary w-100 py-3 fw-semibold shadow-sm"
                      >
                        <span *ngIf="loading()" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        <i *ngIf="!loading()" class="fas fa-key me-2"></i>
                        {{ loading() ? 'Changing Password...' : 'Change Password' }}
                      </button>
                    </div>
                  </div>
                </form>
                
                <!-- Help Section -->
                <div class="text-center pt-3 border-top">
                  <p class="text-muted mb-2">
                    <small>
                      <i class="fas fa-shield-alt me-1"></i>
                      Your password is encrypted and secure
                    </small>
                  </p>
                  <p class="text-xs text-gray-500" *ngIf="!isInitialSetup()">
                    Having trouble? 
                    <a href="mailto:support@onedc.com" class="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200">
                      Contact support
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bg-light-info {
      background-color: rgba(13, 202, 240, 0.1) !important;
    }
    
    .input-group .form-control:focus {
      border-color: #0d6efd;
      box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.25);
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      transition: all 0.3s ease;
    }
    
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .card {
      border-radius: 1rem;
      overflow: hidden;
    }
    
    .card-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    }
    
    @media (max-width: 576px) {
      .card-body {
        padding: 2rem !important;
      }
      
      .card-header {
        padding: 2rem 1rem !important;
      }
    }
  `]
})
export class ChangePasswordComponent {
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private authService = inject(AuthService);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  loading = signal(false);
  submitted = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  ngOnInit() {
    // Check if user actually needs to change password
    const user = this.authService.getCurrentUser();
    if (!user?.mustChangePassword) {
      this.router.navigate(['/dashboard']);
      return;
    }
  }

  isInitialSetup(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.mustChangePassword || false;
  }

  isFormValid(): boolean {
    if (this.isInitialSetup()) {
      return this.newPassword.length >= 8 && 
             this.newPassword === this.confirmPassword;
    } else {
      return this.currentPassword.length > 0 &&
             this.newPassword.length >= 8 && 
             this.newPassword === this.confirmPassword;
    }
  }

  onSubmit() {
    this.submitted = true;
    
    if (!this.isFormValid()) {
      this.toastr.warning('Please fill all fields correctly');
      return;
    }

    this.loading.set(true);
    
    if (this.isInitialSetup()) {
      // Initial password setup for new users
      this.authService.setInitialPassword(this.newPassword).subscribe({
        next: (result) => {
          this.loading.set(false);
          this.toastr.success(result.message || 'Password set successfully!');
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err.error?.message || 'Failed to set password');
        }
      });
    } else {
      // Regular password change
      this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
        next: (response) => {
          this.loading.set(false);
          this.toastr.success(response.message || 'Password changed successfully');
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          this.toastr.error(err.error?.message || 'Failed to change password');
        }
      });
    }
  }
}
