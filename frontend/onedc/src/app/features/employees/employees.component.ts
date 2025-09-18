import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { EmployeesService } from '../../core/services/employees.service';
import { Employee, UserRole, Gender, EmployeeType, Address } from '../../shared/models';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule],
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.scss'
})
export class EmployeesComponent implements OnInit {
  private employeesService = inject(EmployeesService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  // Make Math available in template
  Math = Math;

  // Signals for reactive state management
  employees = signal<Employee[]>([]);
  filteredEmployees = signal<Employee[]>([]);
  loading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  showProfileModal = signal<boolean>(false);
  editingEmployee = signal<Employee | null>(null);
  selectedEmployee = signal<Employee | null>(null);
  searchTerm = signal<string>('');
  roleFilter = signal<string>('');
  departmentFilter = signal<string>('');
  statusFilter = signal<string>('');
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

  // Statistics
  totalEmployees = computed(() => this.employees().length);
  activeEmployees = computed(() => this.employees().filter(e => e.isActive).length);
  inactiveEmployees = computed(() => this.employees().filter(e => !e.isActive).length);
  adminEmployees = computed(() => this.employees().filter(e => e.role === UserRole.ADMIN).length);
  
  // Available options for dropdowns
  availableRoles = [
    { value: UserRole.EMPLOYEE, label: 'Employee' },
    { value: UserRole.APPROVER, label: 'Approver' },
    { value: UserRole.ADMIN, label: 'Admin' }
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

  // Form
  employeeForm: FormGroup;

  constructor() {
    this.employeeForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      workEmail: ['', [Validators.required, Validators.email]],
      personalEmail: ['', [Validators.email]],
      role: [UserRole.EMPLOYEE, [Validators.required]],
      isActive: [true],
      gender: [''],
      dateOfBirth: [''],
      dateOfJoining: ['', [Validators.required]],
      jobTitle: ['', [Validators.required]],
      department: ['', [Validators.required]],
      employeeType: [EmployeeType.FULL_TIME],
      contactNumber: ['', [Validators.required]],
      emergencyContactNumber: [''],
      presentAddress: this.fb.group({
        addressLine1: ['', [Validators.required]],
        addressLine2: [''],
        city: ['', [Validators.required]],
        state: ['', [Validators.required]],
        country: ['', [Validators.required]],
        zipCode: ['', [Validators.required]]
      }),
      permanentAddress: this.fb.group({
        addressLine1: ['', [Validators.required]],
        addressLine2: [''],
        city: ['', [Validators.required]],
        state: ['', [Validators.required]],
        country: ['', [Validators.required]],
        zipCode: ['', [Validators.required]]
      })
    });
  }

  ngOnInit() {
    this.loadEmployees();
    this.setupFiltering();
  }

  private loadEmployees() {
    this.loading.set(true);
    this.employeesService.getAll().subscribe({
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
    this.showModal.set(true);
  }

  openEditModal(employee: Employee) {
    this.editingEmployee.set(employee);
    this.employeeForm.patchValue({
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
      presentAddress: employee.presentAddress || {},
      permanentAddress: employee.permanentAddress || {}
    });
    this.showModal.set(true);
  }

  openProfileModal(employee: Employee) {
    this.selectedEmployee.set(employee);
    this.showProfileModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingEmployee.set(null);
  }

  closeProfileModal() {
    this.showProfileModal.set(false);
    this.selectedEmployee.set(null);
  }

  // Form submission
  onSubmit() {
    if (this.employeeForm.valid) {
      const formValue = this.employeeForm.value;
      
      if (this.editingEmployee()) {
        // Update existing employee
        const employeeData: any = {
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

        this.employeesService.update(this.editingEmployee()!.userId, employeeData).subscribe({
          next: (updatedEmployee) => {
            const employees = this.employees();
            const index = employees.findIndex(e => e.userId === updatedEmployee.userId);
            if (index !== -1) {
              employees[index] = updatedEmployee;
              this.employees.set([...employees]);
              this.setupFiltering();
            }
            this.toastr.success('Employee updated successfully');
            this.closeModal();
          },
          error: (error) => {
            console.error('Error updating employee:', error);
            this.toastr.error('Failed to update employee');
          }
        });
      } else {
        // Create new employee (employeeId will be auto-generated by the backend)
        const employeeData: any = {
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
            this.toastr.success('Employee created successfully');
            this.closeModal();
          },
          error: (error) => {
            console.error('Error creating employee:', error);
            this.toastr.error('Failed to create employee');
          }
        });
      }
    }
  }

  deleteEmployee(employee: Employee) {
    if (confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`)) {
      this.employeesService.delete(employee.userId).subscribe({
        next: () => {
          const employees = this.employees().filter(e => e.userId !== employee.userId);
          this.employees.set(employees);
          this.setupFiltering();
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
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.employeeForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
    }
    return '';
  }

  // Navigate to full profile page for the selected employee
  viewFullProfile(employee: Employee): void {
    this.router.navigate(['/profile', employee.userId]);
  }
}
