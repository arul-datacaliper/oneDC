import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { OnboardingService, UserProfile, UserSkill, SkillLevel, CreateUserProfileRequest, CreateUserSkillRequest, OnboardingStatus } from '../../core/services/onboarding.service';
import { EmployeesService } from '../../core/services/employees.service';
import { Employee } from '../../shared/models';
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
  private employeesService = inject(EmployeesService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);

  // Current user ID from auth service
  currentUserId = signal<string>('');
  
  // Signals for reactive state
  userProfile = signal<UserProfile | null>(null);
  employeeData = signal<Employee | null>(null);
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
      phoneNumber: ['', [Validators.pattern(/^\+?[\d\s\-\(\)]{10,15}$/)]],
      location: [''],
      totalExperienceYears: [null, [Validators.min(0), Validators.max(50)]],
      educationBackground: [''],
      certifications: [''],
      linkedInProfile: [''],
      gitHubProfile: [''],
      // Address fields
      presentAddressLine1: [''],
      presentAddressLine2: [''],
      presentCity: [''],
      presentState: [''],
      presentCountry: [''],
      presentZipCode: ['', [Validators.pattern(/^[A-Za-z0-9\s\-]{3,10}$/)]],
      permanentAddressLine1: [''],
      permanentAddressLine2: [''],
      permanentCity: [''],
      permanentState: [''],
      permanentCountry: [''],
      permanentZipCode: ['', [Validators.pattern(/^[A-Za-z0-9\s\-]{3,10}$/)]],
      sameAsPresentAddress: [false] // Checkbox to copy present address to permanent
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

    // Load employee data for address information
    this.employeesService.getById(userId).subscribe({
      next: (employee) => {
        this.employeeData.set(employee);
        this.populateAddressFields(employee);
      },
      error: (error) => {
        console.error('Error loading employee data:', error);
        // Don't show error toast as this might be normal for new users
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

  populateAddressFields(employee: Employee) {
    // Update address fields
    this.profileForm.patchValue({
      presentAddressLine1: employee.presentAddressLine1 || '',
      presentAddressLine2: employee.presentAddressLine2 || '',
      presentCity: employee.presentCity || '',
      presentState: employee.presentState || '',
      presentCountry: employee.presentCountry || '',
      presentZipCode: employee.presentZipCode || '',
      permanentAddressLine1: employee.permanentAddressLine1 || '',
      permanentAddressLine2: employee.permanentAddressLine2 || '',
      permanentCity: employee.permanentCity || '',
      permanentState: employee.permanentState || '',
      permanentCountry: employee.permanentCountry || '',
      permanentZipCode: employee.permanentZipCode || ''
    });
  }

  // Helper method for copying present address to permanent address
  onSameAddressChange(event: any) {
    const isChecked = event.target.checked;
    if (isChecked) {
      const presentAddress = {
        permanentAddressLine1: this.profileForm.get('presentAddressLine1')?.value || '',
        permanentAddressLine2: this.profileForm.get('presentAddressLine2')?.value || '',
        permanentCity: this.profileForm.get('presentCity')?.value || '',
        permanentState: this.profileForm.get('presentState')?.value || '',
        permanentCountry: this.profileForm.get('presentCountry')?.value || '',
        permanentZipCode: this.profileForm.get('presentZipCode')?.value || ''
      };
      this.profileForm.patchValue(presentAddress);
      
      // Mark permanent address fields as touched to trigger validation
      this.profileForm.get('permanentAddressLine1')?.markAsTouched();
      this.profileForm.get('permanentAddressLine2')?.markAsTouched();
      this.profileForm.get('permanentCity')?.markAsTouched();
      this.profileForm.get('permanentState')?.markAsTouched();
      this.profileForm.get('permanentCountry')?.markAsTouched();
      this.profileForm.get('permanentZipCode')?.markAsTouched();
    }
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

      // Extract address fields for employee update
      const addressData = {
        presentAddressLine1: this.profileForm.get('presentAddressLine1')?.value || '',
        presentAddressLine2: this.profileForm.get('presentAddressLine2')?.value || '',
        presentCity: this.profileForm.get('presentCity')?.value || '',
        presentState: this.profileForm.get('presentState')?.value || '',
        presentCountry: this.profileForm.get('presentCountry')?.value || '',
        presentZipCode: this.profileForm.get('presentZipCode')?.value || '',
        permanentAddressLine1: this.profileForm.get('permanentAddressLine1')?.value || '',
        permanentAddressLine2: this.profileForm.get('permanentAddressLine2')?.value || '',
        permanentCity: this.profileForm.get('permanentCity')?.value || '',
        permanentState: this.profileForm.get('permanentState')?.value || '',
        permanentCountry: this.profileForm.get('permanentCountry')?.value || '',
        permanentZipCode: this.profileForm.get('permanentZipCode')?.value || ''
      };

      // Check if address fields have changed
      const currentEmployee = this.employeeData();
      const addressChanged = currentEmployee ? this.hasAddressChanged(addressData, currentEmployee) : this.hasAddressData(addressData);
      
      this.loading.set(true);
      
      // Use onboarding status to determine if profile truly exists in DB
      // Don't rely on userProfile() as it may contain a virtual profile from AppUser data
      const hasActualProfile = this.onboardingStatus()?.hasProfile ?? false;
      
      const profileOperation = hasActualProfile
        ? this.onboardingService.updateUserProfile(userId, formData)
        : this.onboardingService.createUserProfile(userId, formData);

      // Save profile data first
      profileOperation.subscribe({
        next: (profile) => {
          this.userProfile.set(profile);
          
          // If address data has changed, update it
          if (addressChanged) {
            this.employeesService.update(userId, addressData).subscribe({
              next: (employee) => {
                this.employeeData.set(employee);
                this.toastr.success('Profile and address information saved successfully!');
                this.handlePostSaveActions();
              },
              error: (error) => {
                console.error('Error updating address:', error);
                this.toastr.warning('Profile saved successfully, but address update failed. Please try updating address again.');
                this.loading.set(false);
                this.nextStep();
              }
            });
          } else {
            // No address changes, just profile was updated
            this.toastr.success('Profile saved successfully!');
            this.handlePostSaveActions();
          }
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

  // Helper method to check if address fields have any data
  private hasAddressData(addressData: any): boolean {
    return Object.values(addressData).some(value => value && value.toString().trim() !== '');
  }

  // Helper method to check if address fields have changed
  private hasAddressChanged(newAddressData: any, currentEmployee: Employee): boolean {
    const addressFields = [
      'presentAddressLine1', 'presentAddressLine2', 'presentCity', 'presentState', 'presentCountry', 'presentZipCode',
      'permanentAddressLine1', 'permanentAddressLine2', 'permanentCity', 'permanentState', 'permanentCountry', 'permanentZipCode'
    ];

    return addressFields.some(field => {
      const newValue = newAddressData[field] || '';
      const currentValue = (currentEmployee as any)[field] || '';
      return newValue !== currentValue;
    });
  }

  // Helper method to handle post-save actions
  private handlePostSaveActions(): void {
    // Reload onboarding status first, then move to next step
    this.onboardingService.getOnboardingStatus(this.currentUserId()).subscribe({
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
      if (field.errors['pattern']) {
        if (fieldName === 'phoneNumber') {
          return 'Please enter a valid phone number (10-15 digits, may include +, spaces, dashes, parentheses)';
        }
        if (fieldName.includes('ZipCode') || fieldName.includes('zipCode')) {
          return 'Please enter a valid ZIP/postal code (3-10 characters, letters and numbers only)';
        }
        return `Please enter a valid ${this.capitalizeFirstLetter(fieldName)}`;
      }
    }
    return '';
  }

  private capitalizeFirstLetter(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
