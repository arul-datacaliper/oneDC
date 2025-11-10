import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { OnboardingService, UserProfile, UserSkill, SkillLevel, CreateUserProfileRequest, CreateUserSkillRequest, OnboardingStatus } from '../../core/services/onboarding.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss'
})
export class OnboardingComponent implements OnInit {
  private onboardingService = inject(OnboardingService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);

  // Current user ID from auth service
  currentUserId = signal<string>('');
  
  // Signals for reactive state
  userProfile = signal<UserProfile | null>(null);
  userSkills = signal<UserSkill[]>([]);
  onboardingStatus = signal<OnboardingStatus | null>(null);
  loading = signal<boolean>(false);
  currentStep = signal<number>(1);
  skillLevels = signal<any[]>([]);
  
  // Photo upload
  selectedPhoto = signal<File | null>(null);
  photoPreview = signal<string | null>(null);
  uploadingPhoto = signal<boolean>(false);

  // Form states
  profileForm!: FormGroup;
  skillForm!: FormGroup;
  editingSkill = signal<UserSkill | null>(null);
  showSkillModal = signal<boolean>(false);

  // Computed properties
  isStepComplete = computed(() => {
    const status = this.onboardingStatus();
    if (!status) return [false, false, false];
    
    return [
      status.hasProfile,
      status.hasSkills,
      status.hasPhoto
    ];
  });

  canProceedToStep = computed(() => {
    const completed = this.isStepComplete();
    return [
      true, // Step 1 always accessible
      completed[0], // Step 2 requires profile
      completed[0] && completed[1] // Step 3 requires profile and skills
    ];
  });

  completionPercentage = computed(() => {
    return this.onboardingStatus()?.completionPercentage || 0;
  });

  ngOnInit() {
    // Get current user ID from auth service
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.currentUserId.set(currentUser.userId);
    }
    
    this.initializeForms();
    this.loadSkillLevels();
    this.loadUserData();
  }

  initializeForms() {
    this.profileForm = this.fb.group({
      bio: [''],
      // Admin-managed fields - these will be disabled
      department: [{ value: '', disabled: true }],
      jobTitle: [{ value: '', disabled: true }],
      employeeId: [{ value: '', disabled: true }],
      dateOfJoining: [{ value: '', disabled: true }],
      reportingManager: [{ value: '', disabled: true }],
      // User-editable fields
      phoneNumber: [''],
      location: [''],
      totalExperienceYears: [null, [Validators.min(0), Validators.max(50)]],
      educationBackground: [''],
      certifications: [''],
      linkedInProfile: [''],
      gitHubProfile: ['']
    });

    this.skillForm = this.fb.group({
      skillName: ['', Validators.required],
      level: [SkillLevel.Beginner, Validators.required],
      yearsOfExperience: [1, [Validators.required, Validators.min(0), Validators.max(50)]],
      description: [''],
      isPrimary: [false]
    });
  }

  loadSkillLevels() {
    this.onboardingService.getSkillLevels().subscribe({
      next: (levels) => this.skillLevels.set(levels),
      error: (error) => {
        console.error('Error loading skill levels:', error);
        this.toastr.error('Failed to load skill levels');
      }
    });
  }

  loadUserData() {
    const userId = this.currentUserId();
    if (!userId) {
      this.toastr.error('User not logged in');
      return;
    }

    // Check if user is admin - admins might not need onboarding
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.role === 'ADMIN') {
      this.toastr.info('Admin users can create profiles but onboarding is optional');
    }

    this.loading.set(true);
    
    // Load profile
    this.onboardingService.getUserProfile(userId).subscribe({
      next: (profile) => {
        this.userProfile.set(profile);
        this.populateProfileForm(profile);
      },
      error: (error) => {
        if (error.status !== 404) {
          console.error('Error loading profile:', error);
          this.toastr.error('Failed to load user profile');
        }
      }
    });

    // Load skills
    this.onboardingService.getUserSkills(userId).subscribe({
      next: (skills) => this.userSkills.set(skills),
      error: (error) => {
        console.error('Error loading skills:', error);
        this.toastr.error('Failed to load user skills');
      }
    });

    // Load onboarding status
    this.onboardingService.getOnboardingStatus(userId).subscribe({
      next: (status) => {
        this.onboardingStatus.set(status);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading onboarding status:', error);
        this.toastr.error('Failed to load onboarding status');
        this.loading.set(false);
      }
    });
  }

  populateProfileForm(profile: UserProfile) {
    // Update user-editable fields
    this.profileForm.patchValue({
      bio: profile.bio || '',
      phoneNumber: profile.phoneNumber || '',
      location: profile.location || '',
      totalExperienceYears: profile.totalExperienceYears || null,
      educationBackground: profile.educationBackground || '',
      certifications: profile.certifications || '',
      linkedInProfile: profile.linkedInProfile || '',
      gitHubProfile: profile.gitHubProfile || ''
    });

    // Update admin-managed fields (disabled)
    this.profileForm.get('department')?.setValue(profile.department || 'Not assigned');
    this.profileForm.get('jobTitle')?.setValue(profile.jobTitle || 'Not assigned');
    this.profileForm.get('employeeId')?.setValue(profile.employeeId || 'Not assigned');
    this.profileForm.get('dateOfJoining')?.setValue(profile.dateOfJoining || 'Not specified');
    this.profileForm.get('reportingManager')?.setValue(profile.reportingManager || 'Not assigned');
  }

  // Step navigation
  goToStep(step: number) {
    const canProceed = this.canProceedToStep();
    if (step <= canProceed.length && canProceed[step - 1]) {
      this.currentStep.set(step);
    }
  }

  nextStep() {
    const currentStep = this.currentStep();
    if (currentStep < 3) {
      this.goToStep(currentStep + 1);
    }
  }

  previousStep() {
    const currentStep = this.currentStep();
    if (currentStep > 1) {
      this.goToStep(currentStep - 1);
    }
  }

  // Profile management
  saveProfile() {
    if (this.profileForm.valid) {
      const userId = this.currentUserId();
      
      // Extract only user-editable fields from the form
      const formData: CreateUserProfileRequest = {
        bio: this.profileForm.get('bio')?.value || '',
        phoneNumber: this.profileForm.get('phoneNumber')?.value || '',
        location: this.profileForm.get('location')?.value || '',
        totalExperienceYears: this.profileForm.get('totalExperienceYears')?.value || null,
        educationBackground: this.profileForm.get('educationBackground')?.value || '',
        certifications: this.profileForm.get('certifications')?.value || '',
        linkedInProfile: this.profileForm.get('linkedInProfile')?.value || '',
        gitHubProfile: this.profileForm.get('gitHubProfile')?.value || ''
        // Note: Admin-managed fields (department, jobTitle, employeeId, dateOfJoining, reportingManager) 
        // are NOT included as they come from the AppUser table
      };
      
      this.loading.set(true);
      
      // Use onboarding status to determine if profile truly exists in DB
      // Don't rely on userProfile() as it may contain a virtual profile from AppUser data
      const hasActualProfile = this.onboardingStatus()?.hasProfile ?? false;
      
      const operation = hasActualProfile
        ? this.onboardingService.updateUserProfile(userId, formData)
        : this.onboardingService.createUserProfile(userId, formData);

      operation.subscribe({
        next: (profile) => {
          this.userProfile.set(profile);
          this.toastr.success('Profile saved successfully!');
          
          // Reload onboarding status first, then move to next step
          this.onboardingService.getOnboardingStatus(userId).subscribe({
            next: (status) => {
              this.onboardingStatus.set(status);
              this.loading.set(false);
              this.nextStep();
            },
            error: (error) => {
              console.error('Error loading onboarding status:', error);
              this.loading.set(false);
              // Still move to next step even if status update fails
              this.nextStep();
            }
          });
        },
        error: (error) => {
          console.error('Error saving profile:', error);
          this.toastr.error('Failed to save profile');
          this.loading.set(false);
        }
      });
    } else {
      this.toastr.warning('Please fill in all required fields');
      this.markFormGroupTouched(this.profileForm);
    }
  }

  // Photo management
  onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validate file
      if (!this.onboardingService.validateFileType(file)) {
        this.toastr.error('Please select a valid image file (JPEG, PNG, GIF)');
        return;
      }

      if (!this.onboardingService.validateFileSize(file)) {
        this.toastr.error('File size cannot exceed 5MB');
        return;
      }

      this.selectedPhoto.set(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  uploadPhoto() {
    const photo = this.selectedPhoto();
    const userId = this.currentUserId();
    
    if (photo && userId) {
      this.uploadingPhoto.set(true);
      
      this.onboardingService.uploadProfilePhoto(userId, photo).subscribe({
        next: (response) => {
          this.toastr.success('Photo uploaded successfully!');
          this.loadUserData(); // Refresh profile and status
          this.selectedPhoto.set(null);
          this.photoPreview.set(null);
          this.uploadingPhoto.set(false);
        },
        error: (error) => {
          console.error('Error uploading photo:', error);
          this.toastr.error('Failed to upload photo');
          this.uploadingPhoto.set(false);
        }
      });
    }
  }

  deletePhoto() {
    const userId = this.currentUserId();
    
    this.onboardingService.deleteProfilePhoto(userId).subscribe({
      next: () => {
        this.toastr.success('Photo deleted successfully!');
        this.loadUserData();
      },
      error: (error) => {
        console.error('Error deleting photo:', error);
        this.toastr.error('Failed to delete photo');
      }
    });
  }

  // Skill management
  openSkillModal(skill?: UserSkill) {
    if (skill) {
      this.editingSkill.set(skill);
      this.skillForm.patchValue({
        skillName: skill.skillName,
        level: skill.level,
        yearsOfExperience: skill.yearsOfExperience,
        description: skill.description || '',
        isPrimary: skill.isPrimary
      });
    } else {
      this.editingSkill.set(null);
      this.skillForm.reset({
        skillName: '',
        level: SkillLevel.Beginner,
        yearsOfExperience: 1,
        description: '',
        isPrimary: false
      });
    }
    this.showSkillModal.set(true);
  }

  closeSkillModal() {
    this.showSkillModal.set(false);
    this.editingSkill.set(null);
    this.skillForm.reset();
  }

  saveSkill() {
    if (this.skillForm.valid) {
      const userId = this.currentUserId();
      const formData = this.skillForm.value as CreateUserSkillRequest;
      const editingSkill = this.editingSkill();
      
      const operation = editingSkill
        ? this.onboardingService.updateUserSkill(userId, editingSkill.userSkillId, formData)
        : this.onboardingService.createUserSkill(userId, formData);

      operation.subscribe({
        next: () => {
          this.toastr.success(`Skill ${editingSkill ? 'updated' : 'added'} successfully!`);
          this.loadUserData();
          this.closeSkillModal();
        },
        error: (error) => {
          console.error('Error saving skill:', error);
          this.toastr.error(`Failed to ${editingSkill ? 'update' : 'add'} skill`);
        }
      });
    } else {
      this.markFormGroupTouched(this.skillForm);
    }
  }

  deleteSkill(skill: UserSkill) {
    if (confirm(`Are you sure you want to delete the skill "${skill.skillName}"?`)) {
      const userId = this.currentUserId();
      
      this.onboardingService.deleteUserSkill(userId, skill.userSkillId).subscribe({
        next: () => {
          this.toastr.success('Skill deleted successfully!');
          this.loadUserData();
        },
        error: (error) => {
          console.error('Error deleting skill:', error);
          this.toastr.error('Failed to delete skill');
        }
      });
    }
  }

  // Completion
  completeOnboarding() {
    const userId = this.currentUserId();
    
    this.onboardingService.completeOnboarding(userId).subscribe({
      next: (response) => {
        if (response.completed) {
          this.toastr.success('Onboarding completed successfully!');
          
          // Mark onboarding as complete in AuthService
          this.authService.markOnboardingComplete();
          
          this.loadUserData();
          
          // Optionally redirect to profile page after a delay
          setTimeout(() => {
            window.location.href = '/profile';
          }, 2000);
        } else {
          this.toastr.warning('Please complete all required steps first');
        }
      },
      error: (error) => {
        console.error('Error completing onboarding:', error);
        this.toastr.error('Failed to complete onboarding');
      }
    });
  }

  // Helper methods
  getSkillLevelDisplayName(level: SkillLevel): string {
    return this.onboardingService.getSkillLevelDisplayName(level);
  }

  markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${this.capitalizeFirstLetter(fieldName)} is required`;
      if (field.errors['min']) return `${this.capitalizeFirstLetter(fieldName)} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${this.capitalizeFirstLetter(fieldName)} cannot exceed ${field.errors['max'].max}`;
    }
    return '';
  }

  private capitalizeFirstLetter(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
