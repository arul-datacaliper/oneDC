import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OnboardingService, UserProfile, UserSkill } from '../../core/services/onboarding.service';
import { EmployeesService } from '../../core/services/employees.service';
import { Employee } from '../../shared/models';
import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container-fluid p-4">
      <div class="row">
        <div class="col-12">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 class="mb-0">
                {{ isViewingOwnProfile() ? 'My Profile' : (userProfile()?.firstName + ' ' + userProfile()?.lastName + '\'s Profile') }}
              </h2>
              <div *ngIf="!isViewingOwnProfile()" class="mt-2">
                <button class="btn btn-outline-secondary btn-sm" (click)="goBackToEmployees()">
                  <i class="bi bi-arrow-left"></i> Back to Employees
                </button>
              </div>
            </div>
            <button *ngIf="isViewingOwnProfile()" class="btn btn-primary" (click)="editProfile()">
              <i class="bi bi-pencil"></i> Edit Profile
            </button>
          </div>

          <div *ngIf="loading()" class="text-center py-5">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Loading profile...</p>
          </div>

          <div *ngIf="!loading() && userProfile()" class="row">
            <!-- Profile Photo and Basic Info -->
            <div class="col-md-4 mb-4">
              <div class="card">
                <div class="card-body text-center">
                  <div class="profile-photo mb-3">
                    <div *ngIf="getProfilePhotoUrl(); else defaultAvatar">
                      <img [src]="getProfilePhotoUrl()" 
                           alt="Profile Photo" 
                           class="rounded-circle profile-image"
                           style="width: 150px; height: 150px; object-fit: cover;">
                    </div>
                    <ng-template #defaultAvatar>
                      <div class="rounded-circle profile-image d-flex align-items-center justify-content-center bg-light"
                           style="width: 150px; height: 150px; margin: 0 auto;">
                        <i class="bi bi-person-circle text-muted" style="font-size: 120px;"></i>
                      </div>
                    </ng-template>
                  </div>
                  <h4>{{ getDisplayName() }}</h4>
                  <p class="text-muted">{{ getDisplayEmail() }}</p>
                  <span class="badge bg-primary">{{ getDisplayRole() }}</span>
                </div>
              </div>
            </div>

            <!-- Profile Details -->
            <div class="col-md-8">
              <!-- Employee Information (Read-only) -->
              <div class="card mb-4">
                <div class="card-header bg-info bg-opacity-10">
                  <h5 class="mb-0 text-info"><i class="bi bi-id-badge me-2"></i>Employee Information</h5>
                  <small class="text-muted">These details are managed by HR and cannot be edited</small>
                </div>
                <div class="card-body">
                  <div class="row">
                    <div class="col-md-6 mb-3">
                      <label class="form-label fw-bold text-muted">Employee ID</label>
                      <p class="mb-0 fs-6">{{ userProfile()?.employeeId || 'Not assigned' }}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label fw-bold text-muted">Email Address</label>
                      <p class="mb-0 fs-6">{{ getCurrentUser()?.email }}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label fw-bold text-muted">Department</label>
                      <p class="mb-0 fs-6">{{ userProfile()?.department || 'Not assigned' }}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label fw-bold text-muted">Job Title</label>
                      <p class="mb-0 fs-6">{{ userProfile()?.jobTitle || 'Not assigned' }}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label fw-bold text-muted">Reporting Manager</label>
                      <p class="mb-0 fs-6">{{ userProfile()?.reportingManager || 'Not assigned' }}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label fw-bold text-muted">Date of Joining</label>
                      <p class="mb-0 fs-6">{{ formatDate(userProfile()?.dateOfJoining) || 'Not specified' }}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label fw-bold text-muted">Total Experience</label>
                      <p class="mb-0 fs-6">{{ formatExperience(userProfile()?.totalExperienceYears) }}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label fw-bold text-muted">Role</label>
                      <p class="mb-0 fs-6">
                        <span class="badge" 
                              [class.bg-warning]="getCurrentUser()?.role === 'ADMIN'" 
                              [class.bg-info]="getCurrentUser()?.role === 'APPROVER'"
                              [class.bg-primary]="getCurrentUser()?.role === 'EMPLOYEE'">
                          {{ getCurrentUser()?.role }}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Personal Information (Editable) -->
              <div class="card mb-4">
                <div class="card-header">
                  <h5 class="mb-0"><i class="bi bi-person me-2"></i>Personal Information</h5>
                  <small class="text-muted">You can edit these details</small>
                </div>
                <div class="card-body">
                  <div class="row">
                    <div class="col-md-6 mb-3">
                      <label class="form-label fw-bold">Phone Number</label>
                      <p class="mb-0">{{ userProfile()?.phoneNumber || 'Not provided' }}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label fw-bold">Location</label>
                      <p class="mb-0">{{ userProfile()?.location || 'Not specified' }}</p>
                    </div>
                    <div class="col-12 mb-3">
                      <label class="form-label fw-bold">Bio</label>
                      <p class="mb-0">{{ userProfile()?.bio || 'No bio provided' }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Professional Information -->
              <div class="card mb-4">
                <div class="card-header">
                  <h5 class="mb-0"><i class="bi bi-briefcase me-2"></i>Professional Information</h5>
                </div>
                <div class="card-body">
                  <div class="row">
                    <div class="col-md-12 mb-3">
                      <label class="form-label fw-bold">Education Background</label>
                      <p class="mb-0">{{ userProfile()?.educationBackground || 'Not specified' }}</p>
                    </div>
                    <div class="col-md-12 mb-3">
                      <label class="form-label fw-bold">Certifications</label>
                      <p class="mb-0">{{ userProfile()?.certifications || 'No certifications listed' }}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label fw-bold">LinkedIn Profile</label>
                      <p class="mb-0">
                        <a *ngIf="userProfile()?.linkedInProfile; else noLinkedIn" 
                           [href]="userProfile()?.linkedInProfile" 
                           target="_blank" 
                           class="text-decoration-none">
                          <i class="bi bi-linkedin text-primary me-1"></i>
                          View Profile
                        </a>
                        <ng-template #noLinkedIn>
                          <span class="text-muted">Not provided</span>
                        </ng-template>
                      </p>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label fw-bold">GitHub Profile</label>
                      <p class="mb-0">
                        <a *ngIf="userProfile()?.gitHubProfile; else noGitHub" 
                           [href]="userProfile()?.gitHubProfile" 
                           target="_blank" 
                           class="text-decoration-none">
                          <i class="bi bi-github text-dark me-1"></i>
                          View Profile
                        </a>
                        <ng-template #noGitHub>
                          <span class="text-muted">Not provided</span>
                        </ng-template>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Address Information -->
              <div class="card mb-4" *ngIf="employeeData()">
                <div class="card-header">
                  <h5 class="mb-0"><i class="bi bi-geo-alt me-2"></i>Address Information</h5>
                </div>
                <div class="card-body">
                  <div class="row">
                    <!-- Present Address -->
                    <div class="col-md-6 mb-4">
                      <h6 class="fw-bold text-primary mb-3">Present Address</h6>
                      <div class="mb-2">
                        <label class="form-label fw-bold">Address Line 1</label>
                        <p class="mb-0">{{ employeeData()?.presentAddressLine1 || 'Not provided' }}</p>
                      </div>
                      <div class="mb-2" *ngIf="employeeData()?.presentAddressLine2">
                        <label class="form-label fw-bold">Address Line 2</label>
                        <p class="mb-0">{{ employeeData()?.presentAddressLine2 }}</p>
                      </div>
                      <div class="row">
                        <div class="col-md-6 mb-2">
                          <label class="form-label fw-bold">City</label>
                          <p class="mb-0">{{ employeeData()?.presentCity || 'Not provided' }}</p>
                        </div>
                        <div class="col-md-6 mb-2">
                          <label class="form-label fw-bold">State</label>
                          <p class="mb-0">{{ employeeData()?.presentState || 'Not provided' }}</p>
                        </div>
                      </div>
                      <div class="row">
                        <div class="col-md-6 mb-2">
                          <label class="form-label fw-bold">Country</label>
                          <p class="mb-0">{{ employeeData()?.presentCountry || 'Not provided' }}</p>
                        </div>
                        <div class="col-md-6 mb-2">
                          <label class="form-label fw-bold">ZIP Code</label>
                          <p class="mb-0">{{ employeeData()?.presentZipCode || 'Not provided' }}</p>
                        </div>
                      </div>
                    </div>

                    <!-- Permanent Address -->
                    <div class="col-md-6 mb-4">
                      <h6 class="fw-bold text-success mb-3">Permanent Address</h6>
                      <div class="mb-2">
                        <label class="form-label fw-bold">Address Line 1</label>
                        <p class="mb-0">{{ employeeData()?.permanentAddressLine1 || 'Not provided' }}</p>
                      </div>
                      <div class="mb-2" *ngIf="employeeData()?.permanentAddressLine2">
                        <label class="form-label fw-bold">Address Line 2</label>
                        <p class="mb-0">{{ employeeData()?.permanentAddressLine2 }}</p>
                      </div>
                      <div class="row">
                        <div class="col-md-6 mb-2">
                          <label class="form-label fw-bold">City</label>
                          <p class="mb-0">{{ employeeData()?.permanentCity || 'Not provided' }}</p>
                        </div>
                        <div class="col-md-6 mb-2">
                          <label class="form-label fw-bold">State</label>
                          <p class="mb-0">{{ employeeData()?.permanentState || 'Not provided' }}</p>
                        </div>
                      </div>
                      <div class="row">
                        <div class="col-md-6 mb-2">
                          <label class="form-label fw-bold">Country</label>
                          <p class="mb-0">{{ employeeData()?.permanentCountry || 'Not provided' }}</p>
                        </div>
                        <div class="col-md-6 mb-2">
                          <label class="form-label fw-bold">ZIP Code</label>
                          <p class="mb-0">{{ employeeData()?.permanentZipCode || 'Not provided' }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Skills Section -->
              <div class="card" *ngIf="skills() && skills().length > 0">
                <div class="card-header">
                  <h5 class="mb-0"><i class="bi bi-gear me-2"></i>Skills & Expertise</h5>
                </div>
                <div class="card-body">
                  <div class="row">
                    <div *ngFor="let skill of skills()" class="col-md-6 mb-3">
                      <div class="skill-item">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                          <span class="fw-medium">{{ skill.skillName }}</span>
                          <span class="badge" 
                                [class.bg-success]="skill.level === 4"
                                [class.bg-info]="skill.level === 3"
                                [class.bg-warning]="skill.level === 2"
                                [class.bg-secondary]="skill.level === 1">
                            {{ getSkillLevelText(skill.level) }}
                          </span>
                        </div>
                        <small class="text-muted">
                          {{ skill.yearsOfExperience }} years experience
                          <span *ngIf="skill.isPrimary" class="badge bg-primary ms-2">Primary</span>
                        </small>
                        <p *ngIf="skill.description" class="small text-muted mt-1 mb-0">{{ skill.description }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="!loading() && !userProfile()" class="text-center py-5">
            <i class="bi bi-exclamation-triangle fs-1 text-warning"></i>
            <h4 class="text-muted mt-3">Profile Not Found</h4>
            <p class="text-muted">You haven't completed your onboarding profile yet.</p>
            <button class="btn btn-primary" (click)="goToOnboarding()">
              Complete Onboarding
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-image {
      border: 3px solid #dee2e6;
    }
    .card {
      box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
      border: 1px solid #dee2e6;
      margin-bottom: 1rem;
    }
    .card-header {
      background-color: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }
    .skill-item {
      padding: 0.75rem;
      border: 1px solid #e9ecef;
      border-radius: 0.375rem;
      background-color: #f8f9fa;
    }
    .badge a {
      color: inherit;
      text-decoration: none;
    }
    .badge a:hover {
      color: inherit;
    }
    label.fw-bold.text-muted {
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  `]
})
export class ProfileComponent implements OnInit {
  private onboardingService = inject(OnboardingService);
  private employeesService = inject(EmployeesService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  loading = signal<boolean>(false);
  userProfile = signal<UserProfile | null>(null);
  employeeData = signal<Employee | null>(null);
  skills = signal<UserSkill[]>([]);
  viewingUserId = signal<string | null>(null);
  isViewingOwnProfile = signal<boolean>(true);

  ngOnInit() {
    // Subscribe to route parameter changes (reactive)
    this.route.paramMap.subscribe(params => {
      const userId = params.get('userId');
      console.log('Route params changed - userId:', userId);
      
      if (userId) {
        this.viewingUserId.set(userId);
        this.isViewingOwnProfile.set(false);
        console.log('Setting viewingUserId to:', userId, 'isViewingOwnProfile:', false);
      } else {
        this.viewingUserId.set(null);
        this.isViewingOwnProfile.set(true);
        console.log('No userId in route, viewing own profile');
      }
      
      this.loadProfile();
    });
  }

  getCurrentUser() {
    return this.authService.getCurrentUser();
  }

  loadProfile() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return;

    // Determine which user's profile to load
    const targetUserId = this.viewingUserId() || currentUser.userId;
    
    console.log('loadProfile - currentUser.userId:', currentUser.userId);
    console.log('loadProfile - viewingUserId():', this.viewingUserId());
    console.log('loadProfile - targetUserId:', targetUserId);

    this.loading.set(true);

    // Fetch profile, skills, and employee data in parallel
    const profile$ = this.onboardingService.getUserProfile(targetUserId).pipe(
      catchError(error => {
        console.error('Error fetching profile for userId:', targetUserId, error);
        return of(null);
      })
    );
    
    const skills$ = this.onboardingService.getUserSkills(targetUserId).pipe(
      catchError(error => {
        console.error('Error fetching skills for userId:', targetUserId, error);
        return of([]);
      })
    );

    // For employee data, we need to find the employee by userId
    const employee$ = this.employeesService.getAll().pipe(
      catchError(error => {
        console.error('Error fetching employees:', error);
        return of([]);
      })
    );

    forkJoin({
      profile: profile$,
      skills: skills$,
      employees: employee$
    }).subscribe({
      next: (data) => {
        console.log('Profile loaded:', data.profile);
        console.log('Skills loaded:', data.skills);
        console.log('Employees loaded:', data.employees);
        
        // Find the employee with matching userId
        const employee = data.employees.find((emp: Employee) => emp.userId === targetUserId);
        console.log('Found employee:', employee);
        
        this.userProfile.set(data.profile);
        this.skills.set(data.skills);
        this.employeeData.set(employee || null);
        this.skills.set(data.skills || []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.toastr.error('Failed to load profile');
        this.loading.set(false);
      }
    });
  }

  editProfile() {
    // Navigate to onboarding for editing
    window.location.href = '/onboarding';
  }

  goToOnboarding() {
    // Navigate to onboarding
    window.location.href = '/onboarding';
  }

  // Helper methods for formatting
  formatDate(dateString?: string): string {
    if (!dateString) return 'Not specified';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  }

  formatExperience(years?: number): string {
    if (!years || years === 0) return 'Not specified';
    
    if (years === 1) return '1 year';
    return `${years} years`;
  }

  getSkillLevelText(level: number): string {
    switch (level) {
      case 1: return 'Beginner';
      case 2: return 'Intermediate';
      case 3: return 'Advanced';
      case 4: return 'Expert';
      default: return 'Unknown';
    }
  }

  goBackToEmployees(): void {
    this.router.navigate(['/employees']);
  }

  // Get the display name - use employee data if viewing someone else, otherwise current user
  getDisplayName(): string {
    if (!this.isViewingOwnProfile() && this.employeeData()) {
      const employee = this.employeeData()!;
      return `${employee.firstName} ${employee.lastName}`;
    }
    return this.getCurrentUser()?.name || 'User';
  }

  // Get the display email - use employee data if viewing someone else, otherwise current user
  getDisplayEmail(): string {
    if (!this.isViewingOwnProfile() && this.employeeData()) {
      const employee = this.employeeData()!;
      return employee.workEmail || employee.personalEmail || 'No email';
    }
    return this.getCurrentUser()?.email || 'user@onedc.local';
  }

  // Get the display role - use employee data if viewing someone else, otherwise current user
  getDisplayRole(): string {
    if (!this.isViewingOwnProfile() && this.employeeData()) {
      const employee = this.employeeData()!;
      return employee.role || 'EMPLOYEE';
    }
    return this.getCurrentUser()?.role || 'EMPLOYEE';
  }

  // Get the profile photo URL with correct base URL
  getProfilePhotoUrl(): string | null {
    const profile = this.userProfile();
    if (profile?.profilePhotoUrl) {
      // If the URL is relative, prepend the API base URL
      if (profile.profilePhotoUrl.startsWith('/')) {
        return `http://localhost:5110${profile.profilePhotoUrl}`;
      }
      return profile.profilePhotoUrl;
    }
    return null;
  }
}
