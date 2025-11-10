import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn, AsyncValidatorFn } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { EmployeesService } from '../../core/services/employees.service';
import { OnboardingService, UserProfile, UserSkill } from '../../core/services/onboarding.service';
import { Employee, UserRole, Gender, EmployeeType, Address } from '../../shared/models';
import { SearchableDropdownComponent, DropdownOption } from '../../shared/components/searchable-dropdown.component';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmationDialogService } from '../../core/services/confirmation-dialog.service';
import { forkJoin, of, Observable, timer } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';

// Custom validators for date validation
function notFutureDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare only dates
    
    if (selectedDate > today) {
      return { futureDate: true };
    }
    return null;
  };
}

function minimumAgeValidator(minAge: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const birthDate = new Date(control.value);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    let actualAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      actualAge--;
    }
    
    if (actualAge < minAge) {
      return { minimumAge: { requiredAge: minAge, actualAge } };
    }
    return null;
  };
}

// Custom validator for alphanumeric Employee ID
function alphanumericValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const value = control.value.toString();
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    
    if (!alphanumericRegex.test(value)) {
      return { alphanumeric: true };
    }
    return null;
  };
}

function joiningDateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const joiningDate = new Date(control.value);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Allow today as valid joining date
    
    // Allow future dates for joining date (for planned hires) but not too far in future
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1); // Allow up to 1 year in future
    
    if (joiningDate > maxFutureDate) {
      return { tooFarInFuture: true };
    }
    
    // Don't allow joining dates too far in the past (more than 50 years)
    const minPastDate = new Date();
    minPastDate.setFullYear(minPastDate.getFullYear() - 50);
    
    if (joiningDate < minPastDate) {
      return { tooFarInPast: true };
    }
    
    return null;
  };
}

// Custom async validator to check for duplicate employee IDs
function employeeIdAsyncValidator(employeesService: EmployeesService, currentEmployeeId?: string): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value || !control.value.trim()) {
      return of(null);
    }

    const employeeId = control.value.trim();
    
    // Don't validate if it's the same as the current employee ID (for edit mode)
    if (currentEmployeeId && employeeId === currentEmployeeId) {
      return of(null);
    }

    // Add a small delay to avoid excessive API calls while typing
    return timer(500).pipe(
      switchMap(() => employeesService.checkEmployeeIdExists(employeeId)),
      map(response => {
        const result = response.exists ? { employeeIdExists: true } : null;
        return result;
      }),
      catchError((error) => {
        console.error('Error checking employee ID:', error);
        return of(null); // If API call fails, don't block the form
      })
    );
  };
}

// Custom validator for phone numbers (only digits, spaces, hyphens, parentheses, and + allowed)
function phoneNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const value = control.value.trim();
    
    // First check: Ensure the original value only contains valid characters
    // Valid characters: digits, spaces, hyphens, parentheses, and + (only at start)
    const validCharactersPattern = /^[\d\s\-\(\)]+$|^\+[\d\s\-\(\)]+$/;
    if (!validCharactersPattern.test(value)) {
      return { invalidPhoneNumber: true };
    }
    
    // Second check: Ensure + appears only at the start (if at all)
    if (value.includes('+')) {
      if (!value.startsWith('+') || value.indexOf('+', 1) !== -1) {
        return { invalidPhoneNumber: true };
      }
    }
    
    // Third check: Remove all formatting characters and count digits
    const cleanedValue = value.replace(/[\s\-\(\)\+]/g, '');
    
    // Ensure cleaned value contains only digits
    if (!/^\d+$/.test(cleanedValue)) {
      return { invalidPhoneNumber: true };
    }
    
    // Check minimum length (at least 10 digits after cleaning)
    if (cleanedValue.length < 10) {
      return { phoneNumberTooShort: true };
    }
    
    // Check maximum length (at most 15 digits after cleaning)
    if (cleanedValue.length > 15) {
      return { phoneNumberTooLong: true };
    }
    
    return null;
  };
}

// Custom validator for zip codes (alphanumeric only, no special characters)
function zipCodeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    
    const value = control.value.trim();
    
    // Allow only alphanumeric characters, spaces, and hyphens
    // This covers formats like: 12345, 12345-6789, SW1A 1AA (UK), K1A 0B1 (Canada)
    const zipCodePattern = /^[A-Za-z0-9\s\-]+$/;
    
    if (!zipCodePattern.test(value)) {
      return { invalidZipCode: true };
    }
    
    // Ensure it's not too long (most zip codes are under 10 characters)
    if (value.length > 10) {
      return { zipCodeTooLong: true };
    }
    
    return null;
  };
}

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule, SearchableDropdownComponent],
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.scss'
})
export class EmployeesComponent implements OnInit {
  private employeesService = inject(EmployeesService);
  private onboardingService = inject(OnboardingService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private confirmationDialogService = inject(ConfirmationDialogService);

  // Make Math available in template
  Math = Math;

  // Signals for reactive state management
  employees = signal<Employee[]>([]);
  filteredEmployees = signal<Employee[]>([]);
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false); // Add submitting state to prevent duplicate submissions
  showModal = signal<boolean>(false);
  showProfileModal = signal<boolean>(false);
  editingEmployee = signal<Employee | null>(null);
  selectedEmployee = signal<Employee | null>(null);
  selectedEmployeeProfile = signal<UserProfile | null>(null);
  selectedEmployeeSkills = signal<UserSkill[]>([]);
  profileLoading = signal<boolean>(false);
  searchTerm = signal<string>('');
  roleFilter = signal<string>('');
  departmentFilter = signal<string>('');
  statusFilter = signal<string>('');
  currentStatusView = signal<string>('active'); // Status view filter (active, inactive, all)
  employeeCounts = signal<{ active: number; inactive: number; total: number }>({ active: 0, inactive: 0, total: 0 }); // Employee counts from API
  sameAsPresentAddress = signal<boolean>(false);
  
  // Pagination
  pageSize = signal<number>(25);
  pageIndex = signal<number>(0);
  
  // Computed properties
  totalPages = computed(() => Math.ceil(this.filteredEmployees().length / this.pageSize()));
  paginatedEmployees = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredEmployees().slice(start, end);
  });

  // Note: Employee counts now come from API via employeeCounts signal
  
  // Available options for dropdowns
  availableRoles = [
    { value: UserRole.EMPLOYEE, label: 'Employee' },
    { value: UserRole.APPROVER, label: 'Approver' },
    { value: UserRole.ADMIN, label: 'Admin' },
    { value: UserRole.INFRA, label: 'Infra' },
    { value: UserRole.HR, label: 'HR' },
    { value: UserRole.OPERATION, label: 'Operation' }
  ];

  availableGenders = [
    { value: Gender.MALE, label: 'Male' },
    { value: Gender.FEMALE, label: 'Female' },
    { value: Gender.OTHER, label: 'Other' }
  ];

  availableEmployeeTypes = [
    { value: EmployeeType.FULL_TIME, label: 'Full Time' },
    { value: EmployeeType.PART_TIME, label: 'Part Time' },
    { value: EmployeeType.CONTRACT, label: 'Contract' },
    { value: EmployeeType.INTERN, label: 'Intern' }
  ];

  availableDepartments = [
    'Engineering',
    'Product',
    'Design',
    'Marketing',
    'Sales',
    'HR',
    'Finance',
    'Operations',
    'Customer Success',
    'Data Science'
  ];

  // Computed property for available managers (employees who can manage others)
  availableManagers = computed(() => {
    const currentEditingId = this.editingEmployee()?.userId;
    return this.employees()
      .filter(emp => 
        emp.userId !== currentEditingId && // Can't be their own manager
        emp.isActive && // Must be active
        (emp.role === UserRole.ADMIN || emp.role === UserRole.APPROVER) // Must be admin or approver
      )
      .map(emp => ({
        value: emp.userId,
        label: `${emp.firstName} ${emp.lastName} - ${emp.jobTitle || 'N/A'}`
      }));
  });

  // Form
  employeeForm: FormGroup;

  constructor() {
    this.employeeForm = this.fb.group({
      employeeId: ['', 
        [Validators.required, Validators.maxLength(20), alphanumericValidator()],
        [employeeIdAsyncValidator(this.employeesService)] // Add async validator for duplicate check
      ],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      workEmail: ['', [Validators.required, Validators.email]],
      personalEmail: ['', [Validators.email]],
      role: [UserRole.EMPLOYEE, [Validators.required]],
      isActive: [true],
      gender: [''],
      dateOfBirth: ['', [notFutureDateValidator(), minimumAgeValidator(16)]], // Must be 16+ and not future date
      dateOfJoining: ['', [Validators.required, joiningDateValidator()]], // Cannot be too far in past/future
      jobTitle: ['', [Validators.required]],
      department: ['', [Validators.required]],
      employeeType: [EmployeeType.FULL_TIME],
      contactNumber: ['', [Validators.required, phoneNumberValidator()]],
      emergencyContactNumber: ['', [phoneNumberValidator()]], // Optional but must be valid if provided
      managerId: [''], // Add reporting manager field
      presentAddress: this.fb.group({
        addressLine1: [''],
        addressLine2: [''],
        city: [''],
        state: [''],
        country: [''],
        zipCode: ['', [zipCodeValidator()]]
      }),
      permanentAddress: this.fb.group({
        addressLine1: [''],
        addressLine2: [''],
        city: [''],
        state: [''],
        country: [''],
        zipCode: ['', [zipCodeValidator()]]
      })
    });
  }

  ngOnInit() {
    this.loadEmployees();
    this.loadEmployeeCounts();
    this.setupFiltering();
  }

  private loadEmployeeCounts() {
    this.employeesService.getCounts().subscribe({
      next: (counts) => {
        this.employeeCounts.set(counts);
      },
      error: (error) => {
        console.error('Error loading employee counts:', error);
      }
    });
  }

  // Method to switch to active employees view
  showActiveEmployees() {
    this.currentStatusView.set('active');
    this.loadEmployees();
  }

  // Method to switch to inactive employees view
  showInactiveEmployees() {
    this.currentStatusView.set('inactive');
    this.loadEmployees();
  }

  // Method to show all employees
  showAllEmployees() {
    this.currentStatusView.set('all');
    this.loadEmployees();
  }

  // Method to reactivate an employee
  async reactivateEmployee(employee: Employee) {
    const confirmed = await this.confirmationDialogService.open({
      title: 'Confirm Employee Reactivation',
      message: `Are you sure you want to reactivate ${employee.firstName} ${employee.lastName}?`,
      details: [
        `Employee ID: ${employee.employeeId || 'N/A'}`,
        `Email: ${employee.workEmail}`,
        `This will restore their access to the system`
      ],
      confirmText: 'Reactivate',
      cancelText: 'Cancel',
      type: 'warning'
    });

    if (confirmed) {
      this.employeesService.reactivate(employee.userId).subscribe({
        next: () => {
          this.toastr.success('Employee reactivated successfully');
          this.loadEmployees();
          this.loadEmployeeCounts();
        },
        error: (error) => {
          console.error('Error reactivating employee:', error);
          this.toastr.error('Error reactivating employee');
        }
      });
    }
  }

  private loadEmployees() {
    this.loading.set(true);
    this.employeesService.getAll(this.currentStatusView()).subscribe({
      next: (employees: any[]) => {
        console.log('Raw API response:', employees);
        console.log('Number of employees received:', employees.length);
        
        // Simple transformation - just ensure required fields exist
        const transformedEmployees = employees.map((emp: any) => ({
          userId: emp.userId,
          employeeId: emp.employeeId || 'N/A',
          firstName: emp.firstName || 'Unknown',
          lastName: emp.lastName || 'User',
          gender: emp.gender,
          dateOfBirth: emp.dateOfBirth,
          dateOfJoining: emp.dateOfJoining || new Date().toISOString().split('T')[0],
          jobTitle: emp.jobTitle || 'N/A',
          role: emp.role,
          department: emp.department || 'N/A',
          employeeType: emp.employeeType || 'FULL_TIME',
          personalEmail: emp.personalEmail,
          workEmail: emp.workEmail || emp.email,
          contactNumber: emp.contactNumber || 'N/A',
          emergencyContactNumber: emp.emergencyContactNumber,
          presentAddress: {
            addressLine1: emp.presentAddressLine1 || '',
            addressLine2: emp.presentAddressLine2 || '',
            city: emp.presentCity || '',
            state: emp.presentState || '',
            country: emp.presentCountry || '',
            zipCode: emp.presentZipCode || ''
          },
          permanentAddress: {
            addressLine1: emp.permanentAddressLine1 || '',
            addressLine2: emp.permanentAddressLine2 || '',
            city: emp.permanentCity || '',
            state: emp.permanentState || '',
            country: emp.permanentCountry || '',
            zipCode: emp.permanentZipCode || ''
          },
          isActive: emp.isActive !== false, // Default to true if not specified
          managerId: emp.managerId,
          lastLoginAt: emp.lastLoginAt,
          createdAt: emp.createdAt
        }));
        
        console.log('Transformed employees:', transformedEmployees);
        console.log('Setting employees in signal...');
        this.employees.set(transformedEmployees);
        console.log('Employees signal after set:', this.employees());
        
        this.setupFiltering();
        console.log('Filtered employees after setup:', this.filteredEmployees());
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.toastr.error('Failed to load employees');
        this.loading.set(false);
      }
    });
  }

  private setupFiltering() {
    // Watch for filter changes and update filtered employees
    const updateFilters = () => {
      console.log('Setting up filters...');
      let filtered = this.employees();
      console.log('Initial employees for filtering:', filtered.length);
      
      const searchTerm = this.searchTerm().toLowerCase();
      const roleFilter = this.roleFilter();
      const departmentFilter = this.departmentFilter();
      const statusFilter = this.statusFilter();

      console.log('Filters - Search:', searchTerm, 'Role:', roleFilter, 'Department:', departmentFilter, 'Status:', statusFilter);

      if (searchTerm) {
        filtered = filtered.filter(employee => 
          employee.firstName.toLowerCase().includes(searchTerm) ||
          employee.lastName.toLowerCase().includes(searchTerm) ||
          employee.workEmail.toLowerCase().includes(searchTerm) ||
          (employee.employeeId && employee.employeeId.toLowerCase().includes(searchTerm)) ||
          (employee.jobTitle && employee.jobTitle.toLowerCase().includes(searchTerm)) ||
          (employee.department && employee.department.toLowerCase().includes(searchTerm))
        );
        console.log('After search filter:', filtered.length);
      }

      if (roleFilter) {
        filtered = filtered.filter(employee => employee.role === roleFilter);
        console.log('After role filter:', filtered.length);
      }

      if (departmentFilter) {
        filtered = filtered.filter(employee => employee.department === departmentFilter);
        console.log('After department filter:', filtered.length);
      }

      if (statusFilter) {
        const isActive = statusFilter === 'ACTIVE';
        filtered = filtered.filter(employee => employee.isActive === isActive);
        console.log('After status filter:', filtered.length);
      }

      console.log('Final filtered employees:', filtered.length);
      this.filteredEmployees.set(filtered);
      this.pageIndex.set(0); // Reset pagination when filters change
    };

    // Initial filter
    updateFilters();
  }

  // Search and filter methods
  onSearchChange(event: any) {
    this.searchTerm.set(event.target.value);
    this.setupFiltering();
  }

  onRoleFilterChange(event: any) {
    this.roleFilter.set(event.target.value);
    this.setupFiltering();
  }

  onDepartmentFilterChange(event: any) {
    this.departmentFilter.set(event.target.value);
    this.setupFiltering();
  }

  onStatusFilterChange(event: any) {
    this.statusFilter.set(event.target.value);
    this.setupFiltering();
  }

  // Modal methods
  openCreateModal() {
    this.editingEmployee.set(null);
    this.employeeForm.reset({
      role: UserRole.EMPLOYEE,
      isActive: true,
      employeeType: EmployeeType.FULL_TIME
    });
    this.sameAsPresentAddress.set(false);
    
    // Reset the employeeId field validator for create mode (no current employee ID)
    const employeeIdControl = this.employeeForm.get('employeeId');
    if (employeeIdControl) {
      employeeIdControl.setAsyncValidators([employeeIdAsyncValidator(this.employeesService)]);
      employeeIdControl.updateValueAndValidity();
    }
    
    this.showModal.set(true);
  }

  openEditModal(employee: Employee) {
    this.editingEmployee.set(employee);
    
    // Update the employeeId field validator to include the current employee ID for edit mode
    const employeeIdControl = this.employeeForm.get('employeeId');
    if (employeeIdControl) {
      employeeIdControl.setAsyncValidators([employeeIdAsyncValidator(this.employeesService, employee.employeeId)]);
      employeeIdControl.updateValueAndValidity();
    }
    
    this.employeeForm.patchValue({
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      workEmail: employee.workEmail,
      personalEmail: employee.personalEmail,
      role: employee.role,
      isActive: employee.isActive,
      gender: employee.gender,
      dateOfBirth: employee.dateOfBirth,
      dateOfJoining: employee.dateOfJoining,
      jobTitle: employee.jobTitle,
      department: employee.department,
      employeeType: employee.employeeType,
      contactNumber: employee.contactNumber,
      emergencyContactNumber: employee.emergencyContactNumber,
      managerId: employee.managerId || '', // Add reporting manager
      presentAddress: employee.presentAddress || {},
      permanentAddress: employee.permanentAddress || {}
    });
    this.showModal.set(true);
    
    // Debug: Log form validation errors after patching values
    setTimeout(() => {
      if (this.employeeForm.invalid) {
        console.log('=== FORM VALIDATION ERRORS ===');
        console.log('Form errors:', this.getFormErrors());
        console.log('Form value:', this.employeeForm.value);
      }
    }, 100);
  }

  openProfileModal(employee: Employee) {
    this.selectedEmployee.set(employee);
    this.showProfileModal.set(true);
    this.profileLoading.set(true);
    
    // Fetch comprehensive profile data
    const profile$ = this.onboardingService.getUserProfile(employee.userId).pipe(
      catchError(error => {
        console.error('Error fetching profile for user:', employee.userId, error);
        return of(null);
      })
    );
    
    const skills$ = this.onboardingService.getUserSkills(employee.userId).pipe(
      catchError(error => {
        console.error('Error fetching skills for user:', employee.userId, error);
        return of([]);
      })
    );

    forkJoin({
      profile: profile$,
      skills: skills$
    }).subscribe({
      next: (data) => {
        this.selectedEmployeeProfile.set(data.profile);
        this.selectedEmployeeSkills.set(data.skills);
        this.profileLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading profile data:', error);
        this.profileLoading.set(false);
      }
    });
  }

  closeModal() {
    this.showModal.set(false);
    this.editingEmployee.set(null);
  }

  closeProfileModal() {
    this.showProfileModal.set(false);
    this.selectedEmployee.set(null);
    this.selectedEmployeeProfile.set(null);
    this.selectedEmployeeSkills.set([]);
    this.profileLoading.set(false);
  }

  // Form submission
  onSubmit() {
    if (this.employeeForm.valid && !this.submitting()) {
      this.submitting.set(true); // Prevent multiple submissions
      const formValue = this.employeeForm.value;
      
      if (this.editingEmployee()) {
        // Update existing employee
        const employeeData: any = {
          employeeId: formValue.employeeId, // Include Employee ID for updates
          firstName: formValue.firstName,
          lastName: formValue.lastName,
          workEmail: formValue.workEmail,
          personalEmail: formValue.personalEmail,
          role: formValue.role,
          isActive: formValue.isActive,
          gender: formValue.gender,
          dateOfBirth: formValue.dateOfBirth,
          dateOfJoining: formValue.dateOfJoining,
          jobTitle: formValue.jobTitle,
          department: formValue.department,
          employeeType: formValue.employeeType,
          contactNumber: formValue.contactNumber,
          emergencyContactNumber: formValue.emergencyContactNumber,
          managerId: formValue.managerId || null, // Add reporting manager
          // Flatten present address
          presentAddressLine1: formValue.presentAddress?.addressLine1 || '',
          presentAddressLine2: formValue.presentAddress?.addressLine2 || '',
          presentCity: formValue.presentAddress?.city || '',
          presentState: formValue.presentAddress?.state || '',
          presentCountry: formValue.presentAddress?.country || '',
          presentZipCode: formValue.presentAddress?.zipCode || '',
          // Flatten permanent address
          permanentAddressLine1: formValue.permanentAddress?.addressLine1 || '',
          permanentAddressLine2: formValue.permanentAddress?.addressLine2 || '',
          permanentCity: formValue.permanentAddress?.city || '',
          permanentState: formValue.permanentAddress?.state || '',
          permanentCountry: formValue.permanentAddress?.country || '',
          permanentZipCode: formValue.permanentAddress?.zipCode || ''
        };

        // Check if we're updating the current logged-in user's role
        const currentUser = this.authService.getCurrentUser();
        const isUpdatingCurrentUser = currentUser && this.editingEmployee()!.userId === currentUser.userId;
        const roleChanged = isUpdatingCurrentUser && this.editingEmployee()!.role !== formValue.role;

        this.employeesService.update(this.editingEmployee()!.userId, employeeData).subscribe({
          next: (updatedEmployee) => {
            const employees = this.employees();
            const index = employees.findIndex(e => e.userId === updatedEmployee.userId);
            if (index !== -1) {
              employees[index] = updatedEmployee;
              this.employees.set([...employees]);
              this.setupFiltering();
            }
            this.loadEmployeeCounts(); // Update employee counts (in case status changed)
            this.toastr.success('Employee updated successfully');
            this.submitting.set(false); // Reset submitting state on success
            this.closeModal();

            // If the current user's role was changed, refresh the token
            if (roleChanged) {
              this.toastr.info('Your role has been updated. Refreshing your session...', 'Role Updated', {
                timeOut: 3000
              });
              
              // Refresh the token to get updated role information
              this.authService.refreshToken().subscribe({
                next: () => {
                  this.toastr.success('Session refreshed successfully. Your new permissions are now active.', 'Success', {
                    timeOut: 3000
                  });
                  // Force a small delay to ensure the UI updates
                  setTimeout(() => {
                    // Optionally reload the current page to reflect new permissions
                    window.location.reload();
                  }, 1000);
                },
                error: (error) => {
                  console.error('Error refreshing token:', error);
                  this.toastr.warning('Please log out and log back in to see your new role permissions.', 'Session Refresh Failed', {
                    timeOut: 5000
                  });
                }
              });
            }
          },
          error: (error) => {
            console.error('Error updating employee:', error);
            
            // Handle specific error types
            if (error.status === 409) {
              // Conflict - duplicate email or employee ID
              this.toastr.error(error.error?.detail || error.error?.message || 'An employee with this email already exists');
            } else if (error.status === 400) {
              // Bad request - validation errors
              this.toastr.error(error.error?.detail || error.error?.message || 'Invalid employee data provided');
            } else if (error.status === 408) {
              // Request timeout
              this.toastr.error(error.error?.detail || 'Request timed out. Please try again in a moment.');
            } else if (error.status === 500) {
              // Internal server error
              this.toastr.error(error.error?.detail || 'An unexpected error occurred. Please try again.');
            } else {
              // Generic error handling
              const errorMessage = error?.error?.message || 'Failed to update employee';
              this.toastr.error(errorMessage);
            }
            this.submitting.set(false); // Reset submitting state on error
          }
        });
      } else {
        // Create new employee (employeeId is now manually entered and required)
        const employeeData: any = {
          employeeId: formValue.employeeId, // Include the manually entered Employee ID
          firstName: formValue.firstName,
          lastName: formValue.lastName,
          workEmail: formValue.workEmail,
          personalEmail: formValue.personalEmail,
          role: formValue.role,
          isActive: formValue.isActive,
          gender: formValue.gender,
          dateOfBirth: formValue.dateOfBirth,
          dateOfJoining: formValue.dateOfJoining,
          jobTitle: formValue.jobTitle,
          department: formValue.department,
          employeeType: formValue.employeeType,
          contactNumber: formValue.contactNumber,
          emergencyContactNumber: formValue.emergencyContactNumber,
          managerId: formValue.managerId || null, // Add reporting manager
          // Flatten present address
          presentAddressLine1: formValue.presentAddress?.addressLine1 || '',
          presentAddressLine2: formValue.presentAddress?.addressLine2 || '',
          presentCity: formValue.presentAddress?.city || '',
          presentState: formValue.presentAddress?.state || '',
          presentCountry: formValue.presentAddress?.country || '',
          presentZipCode: formValue.presentAddress?.zipCode || '',
          // Flatten permanent address
          permanentAddressLine1: formValue.permanentAddress?.addressLine1 || '',
          permanentAddressLine2: formValue.permanentAddress?.addressLine2 || '',
          permanentCity: formValue.permanentAddress?.city || '',
          permanentState: formValue.permanentAddress?.state || '',
          permanentCountry: formValue.permanentAddress?.country || '',
          permanentZipCode: formValue.permanentAddress?.zipCode || ''
        };

        this.employeesService.create(employeeData).subscribe({
          next: (newEmployee) => {
            this.employees.set([...this.employees(), newEmployee]);
            this.setupFiltering();
            this.loadEmployeeCounts(); // Update employee counts
            this.toastr.success('Employee created successfully');
            this.submitting.set(false); // Reset submitting state on success
            this.closeModal();
          },
          error: (error) => {
            console.error('Error creating employee:', error);
            
            // Handle specific error types
            if (error.status === 409) {
              // Conflict - duplicate email or employee ID
              this.toastr.error(error.error?.detail || error.error?.message || 'An employee with this email already exists');
            } else if (error.status === 400) {
              // Bad request - validation errors
              this.toastr.error(error.error?.detail || error.error?.message || 'Invalid employee data provided');
            } else if (error.status === 408) {
              // Request timeout
              this.toastr.error(error.error?.detail || 'Request timed out. Please try again in a moment.');
            } else if (error.status === 500) {
              // Internal server error
              this.toastr.error(error.error?.detail || 'An unexpected error occurred. Please try again.');
            } else {
              // Generic error handling
              const errorMessage = error?.error?.message || 'Failed to create employee';
              this.toastr.error(errorMessage);
            }
            this.submitting.set(false); // Reset submitting state on error
          }
        });
      }
    }
  }

  async deleteEmployee(employee: Employee) {
    const confirmed = await this.confirmationDialogService.open({
      title: 'Confirm Employee Deletion',
      message: `Are you sure you want to delete ${employee.firstName} ${employee.lastName}? This action cannot be undone.`,
      details: [
        `Employee ID: ${employee.employeeId || 'N/A'}`,
        `Email: ${employee.workEmail}`,
        `Department: ${employee.department || 'N/A'}`
      ],
      confirmText: 'Delete Employee',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (confirmed) {
      this.employeesService.delete(employee.userId).subscribe({
        next: () => {
          const employees = this.employees().filter(e => e.userId !== employee.userId);
          this.employees.set(employees);
          this.setupFiltering();
          this.loadEmployeeCounts(); // Update employee counts
          this.toastr.success('Employee deleted successfully');
        },
        error: (error) => {
          console.error('Error deleting employee:', error);
          this.toastr.error('Failed to delete employee');
        }
      });
    }
  }

  // Address methods
  onSameAsPresentAddressChange(checked: boolean) {
    this.sameAsPresentAddress.set(checked);
    if (checked) {
      const presentAddress = this.employeeForm.get('presentAddress')?.value;
      this.employeeForm.get('permanentAddress')?.patchValue(presentAddress);
    }
  }

  // Utility methods
  getFullName(employee: Employee): string {
    return `${employee.firstName} ${employee.lastName}`;
  }

  getRoleClass(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN: return 'badge bg-danger';
      case UserRole.APPROVER: return 'badge bg-warning';
      case UserRole.EMPLOYEE: return 'badge bg-info';
      case UserRole.INFRA: return 'badge bg-primary';
      case UserRole.HR: return 'badge bg-success';
      case UserRole.OPERATION: return 'badge bg-secondary';
      default: return 'badge bg-secondary';
    }
  }

  getStatusClass(isActive: boolean): string {
    return isActive ? 'badge bg-success' : 'badge bg-secondary';
  }

  getAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  formatAddress(address: Address): string {
    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.city,
      address.state,
      address.country,
      address.zipCode
    ].filter(part => part && part.trim());
    
    return parts.join(', ');
  }

  // Format flattened address fields from API
  formatFlatAddress(
    line1?: string, 
    line2?: string, 
    city?: string, 
    state?: string, 
    country?: string, 
    zipCode?: string
  ): string {
    const parts = [line1, line2, city, state, country, zipCode]
      .filter(part => part && part.trim());
    
    return parts.length > 0 ? parts.join(', ') : 'No address on file';
  }

  trackByEmployeeId(index: number, employee: Employee): string {
    return employee.userId;
  }

  // Pagination methods
  nextPage() {
    if (this.pageIndex() < this.totalPages() - 1) {
      this.pageIndex.set(this.pageIndex() + 1);
    }
  }

  previousPage() {
    if (this.pageIndex() > 0) {
      this.pageIndex.set(this.pageIndex() - 1);
    }
  }

  goToPage(page: number) {
    this.pageIndex.set(page);
  }

  getPageNumbers(): number[] {
    const totalPages = this.totalPages();
    const current = this.pageIndex();
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    
    for (let i = Math.max(0, current - delta); i <= Math.min(current + delta, totalPages - 1); i++) {
      range.push(i);
    }
    
    if (range[0] > 0) {
      rangeWithDots.push(0);
      if (range[0] > 1) {
        rangeWithDots.push(-1); // -1 represents "..."
      }
    }
    
    rangeWithDots.push(...range);
    
    if (range[range.length - 1] < totalPages - 1) {
      if (range[range.length - 1] < totalPages - 2) {
        rangeWithDots.push(-1); // -1 represents "..."
      }
      rangeWithDots.push(totalPages - 1);
    }
    
    return rangeWithDots.filter(page => page !== -1);
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.employeeForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || field.value?.trim()));
  }

  isFieldPending(fieldName: string): boolean {
    const field = this.employeeForm.get(fieldName);
    return !!(field && field.pending);
  }

  getFieldError(fieldName: string): string {
    const field = this.employeeForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return `${this.capitalizeFirstLetter(fieldName)} is required`;
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['minlength']) return `${this.capitalizeFirstLetter(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['maxlength']) return `${this.capitalizeFirstLetter(fieldName)} cannot exceed ${field.errors['maxlength'].requiredLength} characters`;
      if (field.errors['alphanumeric']) return `${this.capitalizeFirstLetter(fieldName)} can only contain letters and numbers (no special characters or spaces)`;
      if (field.errors['futureDate']) return 'Date cannot be in the future';
      if (field.errors['minimumAge']) return `Employee must be at least ${field.errors['minimumAge'].requiredAge} years old`;
      if (field.errors['tooFarInFuture']) return 'Joining date cannot be more than 1 year in the future';
      if (field.errors['tooFarInPast']) return 'Joining date cannot be more than 50 years in the past';
      if (field.errors['invalidPhoneNumber']) return 'Phone number can only contain digits, spaces, hyphens, parentheses, and +';
      if (field.errors['phoneNumberTooShort']) return 'Phone number must be at least 10 digits';
      if (field.errors['phoneNumberTooLong']) return 'Phone number cannot exceed 15 digits';
      if (field.errors['invalidZipCode']) return 'Zip code can only contain letters, numbers, spaces, and hyphens';
      if (field.errors['zipCodeTooLong']) return 'Zip code cannot exceed 10 characters';
      if (field.errors['employeeIdExists']) return 'This Employee ID is already in use';
    }
    return '';
  }

  // Navigate to full profile page for the selected employee
  viewFullProfile(employee: Employee): void {
    this.router.navigate(['/profile', employee.userId]);
  }

  // Get skill level text
  getSkillLevelText(level: number): string {
    switch (level) {
      case 1: return 'Beginner';
      case 2: return 'Intermediate';
      case 3: return 'Advanced';
      case 4: return 'Expert';
      default: return 'Unknown';
    }
  }

  // Get manager name by ID
  getManagerName(managerId: string | undefined): string {
    if (!managerId) return 'No Manager';
    const manager = this.employees().find(emp => emp.userId === managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : 'Unknown Manager';
  }

  // Debug method to get all form errors
  getFormErrors(): string[] {
    const errors: string[] = [];
    Object.keys(this.employeeForm.controls).forEach(key => {
      const control = this.employeeForm.get(key);
      if (control && control.invalid) {
        const fieldErrors = control.errors;
        if (fieldErrors) {
          Object.keys(fieldErrors).forEach(errorKey => {
            errors.push(`${key}: ${errorKey} = ${JSON.stringify(fieldErrors[errorKey])}`);
          });
        }
      }
    });
    return errors;
  }

  // Method to handle keypress events for Employee ID field (allow only alphanumeric)
  onEmployeeIdKeypress(event: KeyboardEvent): void {
    const char = event.key;
    const alphanumericRegex = /^[a-zA-Z0-9]$/;
    
    // Allow backspace, delete, tab, escape, enter, and arrow keys
    if (event.key === 'Backspace' || event.key === 'Delete' || event.key === 'Tab' || 
        event.key === 'Escape' || event.key === 'Enter' || 
        event.key === 'ArrowLeft' || event.key === 'ArrowRight' ||
        event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      return;
    }
    
    // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
    if (event.ctrlKey || event.metaKey) {
      return;
    }
    
    // Block non-alphanumeric characters
    if (!alphanumericRegex.test(char)) {
      event.preventDefault();
    }
  }

  // Method to handle paste events for Employee ID field (filter non-alphanumeric)
  onEmployeeIdPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text') || '';
    const filtered = paste.replace(/[^a-zA-Z0-9]/g, '');
    
    const control = this.employeeForm.get('employeeId');
    if (control) {
      const currentValue = control.value || '';
      const cursorPosition = (event.target as HTMLInputElement).selectionStart || 0;
      const newValue = currentValue.slice(0, cursorPosition) + filtered + currentValue.slice(cursorPosition);
      
      // Respect maxLength constraint
      const maxLength = 20;
      const finalValue = newValue.length > maxLength ? newValue.slice(0, maxLength) : newValue;
      
      control.setValue(finalValue);
      control.markAsTouched();
    }
  }

  private capitalizeFirstLetter(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
