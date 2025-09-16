import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { OnboardingService, UserProfile, UserSkill, SkillLevel, CreateUserProfileRequest, CreateUserSkillRequest, OnboardingStatus } from '../../core/services/onboarding.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss'
})
export class OnboardingComponent implements OnInit {
  private onboardingService = inject(OnboardingService);
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);

  // Current user ID (in a real app, this would come from auth service)
  currentUserId = signal<string>(localStorage.getItem('debugUserId') || '');
  
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
    this.initializeForms();
    this.loadSkillLevels();
    this.loadUserData();
  }

  initializeForms() {
    this.profileForm = this.fb.group({
      bio: [''],
      department: [''],
      jobTitle: ['', Validators.required],
      phoneNumber: [''],
      location: [''],
      dateOfJoining: [''],
      employeeId: [''],
      reportingManager: [''],
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
      this.toastr.error('Please set a user ID in the debug menu');
      return;
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
    this.profileForm.patchValue({
      bio: profile.bio || '',
      department: profile.department || '',
      jobTitle: profile.jobTitle || '',
      phoneNumber: profile.phoneNumber || '',
      location: profile.location || '',
      dateOfJoining: profile.dateOfJoining || '',
      employeeId: profile.employeeId || '',
      reportingManager: profile.reportingManager || '',
      totalExperienceYears: profile.totalExperienceYears || null,
      educationBackground: profile.educationBackground || '',
      certifications: profile.certifications || '',
      linkedInProfile: profile.linkedInProfile || '',
      gitHubProfile: profile.gitHubProfile || ''
    });
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
      const formData = this.profileForm.value as CreateUserProfileRequest;
      
      this.loading.set(true);
      
      const operation = this.userProfile() 
        ? this.onboardingService.updateUserProfile(userId, formData)
        : this.onboardingService.createUserProfile(userId, formData);

      operation.subscribe({
        next: (profile) => {
          this.userProfile.set(profile);
          this.toastr.success('Profile saved successfully!');
          this.loadUserData(); // Refresh status
          this.nextStep();
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
          this.loadUserData();
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
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['min']) return `${fieldName} must be at least ${field.errors['min'].min}`;
      if (field.errors['max']) return `${fieldName} cannot exceed ${field.errors['max'].max}`;
    }
    return '';
  }
}
