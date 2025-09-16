import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnboardingService, UserProfile, UserSkill } from '../../core/services/onboarding.service';
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
            <h2 class="mb-0">My Profile</h2>
            <button class="btn btn-primary" (click)="editProfile()">
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
                    <div *ngIf="userProfile()?.profilePhotoUrl; else defaultAvatar">
                      <img [src]="userProfile()?.profilePhotoUrl" 
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
                  <h4>{{ getCurrentUser()?.name }}</h4>
                  <p class="text-muted">{{ getCurrentUser()?.email }}</p>
                  <span class="badge bg-primary">{{ getCurrentUser()?.role }}</span>
                </div>
              </div>
            </div>

            <!-- Profile Details -->
            <div class="col-md-8">
              <div class="card">
                <div class="card-header">
                  <h5 class="mb-0"><i class="bi bi-person me-2"></i>Personal Information</h5>
                </div>
                <div class="card-body">
                  <div class="row">
                    <div class="col-md-6 mb-3">
                      <label class="form-label fw-bold">Department</label>
                      <p class="mb-0">{{ userProfile()?.department || 'Not specified' }}</p>
                    </div>
                    <div class="col-md-6 mb-3">
                      <label class="form-label fw-bold">Job Title</label>
                      <p class="mb-0">{{ userProfile()?.jobTitle || 'Not specified' }}</p>
                    </div>
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

              <!-- Skills Section -->
              <div class="card mt-4" *ngIf="skills() && skills().length > 0">
                <div class="card-header">
                  <h5 class="mb-0"><i class="bi bi-gear me-2"></i>Skills</h5>
                </div>
                <div class="card-body">
                  <div class="d-flex flex-wrap gap-2">
                    <span *ngFor="let skill of skills()" 
                          class="badge bg-secondary">{{ skill.skillName }}</span>
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
    }
    .card-header {
      background-color: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }
  `]
})
export class ProfileComponent implements OnInit {
  private onboardingService = inject(OnboardingService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);

  loading = signal<boolean>(false);
  userProfile = signal<UserProfile | null>(null);
  skills = signal<UserSkill[]>([]);

  ngOnInit() {
    this.loadProfile();
  }

  getCurrentUser() {
    return this.authService.getCurrentUser();
  }

  loadProfile() {
    const user = this.getCurrentUser();
    if (!user) return;

    this.loading.set(true);

    // Fetch profile and skills in parallel
    const profile$ = this.onboardingService.getUserProfile(user.userId).pipe(
      catchError(error => of(null))
    );
    
    const skills$ = this.onboardingService.getUserSkills(user.userId).pipe(
      catchError(error => of([]))
    );

    forkJoin({
      profile: profile$,
      skills: skills$
    }).subscribe({
      next: (data) => {
        this.userProfile.set(data.profile);
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
}
