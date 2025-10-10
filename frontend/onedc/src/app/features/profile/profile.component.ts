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
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
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
      // The profilePhotoUrl from database storage contains the relative path: /api/files/profile-photos/{filename}
      // If the URL is relative, prepend the API base URL
      if (profile.profilePhotoUrl.startsWith('/')) {
        // Use environment configuration for the base URL
        const baseUrl = environment.apiBaseUrl.replace('/api', ''); // Remove /api to get just the server URL
        return `${baseUrl}${profile.profilePhotoUrl}`;
      }
      // If it's already a full URL, return as is
      return profile.profilePhotoUrl;
    }
    return null;
  }

  // Helper methods for address checking
  hasAddressInfo(): boolean {
    return this.hasPresentAddress() || this.hasPermanentAddress();
  }

  hasPresentAddress(): boolean {
    const employee = this.employeeData();
    return !!(employee?.presentAddressLine1 || employee?.presentCity || employee?.presentState || employee?.presentCountry);
  }

  hasPermanentAddress(): boolean {
    const employee = this.employeeData();
    return !!(employee?.permanentAddressLine1 || employee?.permanentCity || employee?.permanentState || employee?.permanentCountry);
  }

  // Get the profile title for the header
  getProfileTitle(): string {
    if (this.isViewingOwnProfile()) {
      return 'My Profile';
    }
    
    // If viewing someone else's profile, get name from employeeData
    const employee = this.employeeData();
    if (employee?.firstName && employee?.lastName) {
      return `${employee.firstName} ${employee.lastName}'s Profile`;
    }
    
    return 'User Profile';
  }
}
