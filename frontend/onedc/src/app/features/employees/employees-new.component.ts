import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { EmployeesService } from '../../core/services/employees.service';
import { Employee, Gender, EmployeeType, UserRole, Address } from '../../shared/models';

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
  statusFilter = signal<string>('');
  departmentFilter = signal<string>('');
  
  // Form state
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
  approverEmployees = computed(() => this.employees().filter(e => e.role === UserRole.APPROVER).length);
  employeeRoles = computed(() => this.employees().filter(e => e.role === UserRole.EMPLOYEE).length);

  // Form
  employeeForm: FormGroup;

  // Available options
  availableRoles = [
    { value: UserRole.ADMIN, label: 'Admin' },
    { value: UserRole.APPROVER, label: 'Approver' },
    { value: UserRole.EMPLOYEE, label: 'Employee' }
  ];

  availableGenders = [
    { value: Gender.MALE, label: 'Male' },
    { value: Gender.FEMALE, label: 'Female' },
    { value: Gender.OTHER, label: 'Other' },
    { value: Gender.PREFER_NOT_TO_SAY, label: 'Prefer not to say' }
  ];

  availableEmployeeTypes = [
    { value: EmployeeType.FULL_TIME, label: 'Full Time' },
    { value: EmployeeType.PART_TIME, label: 'Part Time' },
    { value: EmployeeType.CONTRACT, label: 'Contract' },
    { value: EmployeeType.INTERN, label: 'Intern' },
    { value: EmployeeType.CONSULTANT, label: 'Consultant' }
  ];

  availableDepartments = [
    'Engineering',
    'Design',
    'Product',
    'Marketing',
    'Sales',
    'HR',
    'Finance',
    'Operations',
    'Quality Assurance',
    'DevOps'
  ];

  constructor() {
    this.employeeForm = this.fb.group({
      employeeId: ['', [Validators.required, Validators.maxLength(20)]],
      firstName: ['', [Validators.required, Validators.maxLength(80)]],
      lastName: ['', [Validators.required, Validators.maxLength(80)]],
      gender: [''],
      dateOfBirth: [''],
      dateOfJoining: ['', Validators.required],
      jobTitle: ['', [Validators.required, Validators.maxLength(100)]],
      role: [UserRole.EMPLOYEE, Validators.required],
      department: ['', [Validators.required, Validators.maxLength(100)]],
      employeeType: [EmployeeType.FULL_TIME, Validators.required],
      personalEmail: ['', [Validators.email, Validators.maxLength(150)]],
      workEmail: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      contactNumber: ['', [Validators.required, Validators.maxLength(30)]],
      emergencyContactNumber: ['', [Validators.maxLength(30)]],
      presentAddress: this.fb.group({
        addressLine1: ['', [Validators.required, Validators.maxLength(200)]],
        addressLine2: ['', [Validators.maxLength(200)]],
        city: ['', [Validators.required, Validators.maxLength(80)]],
        state: ['', [Validators.required, Validators.maxLength(80)]],
        country: ['', [Validators.required, Validators.maxLength(80)]],
        zipCode: ['', [Validators.required, Validators.maxLength(20)]]
      }),
      permanentAddress: this.fb.group({
        addressLine1: ['', [Validators.required, Validators.maxLength(200)]],
        addressLine2: ['', [Validators.maxLength(200)]],
        city: ['', [Validators.required, Validators.maxLength(80)]],
        state: ['', [Validators.required, Validators.maxLength(80)]],
        country: ['', [Validators.required, Validators.maxLength(80)]],
        zipCode: ['', [Validators.required, Validators.maxLength(20)]]
      }),
      isActive: [true]
    });
  }

  ngOnInit() {
    this.loadEmployees();
  }

  private loadEmployees() {
    this.loading.set(true);
    this.employeesService.getAll().subscribe({
      next: (employees) => {
        this.employees.set(employees);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.toastr.error('Failed to load employees');
        this.loading.set(false);
      }
    });
  }

  private applyFilters() {
    let filtered = this.employees();
    
    // Apply search filter
    const searchTerm = this.searchTerm().toLowerCase();
    if (searchTerm) {
      filtered = filtered.filter(employee => 
        employee.firstName.toLowerCase().includes(searchTerm) ||
        employee.lastName.toLowerCase().includes(searchTerm) ||
        employee.workEmail.toLowerCase().includes(searchTerm) ||
        (employee.employeeId?.toLowerCase().includes(searchTerm) ?? false) ||
        (employee.jobTitle?.toLowerCase().includes(searchTerm) ?? false) ||
        (employee.department?.toLowerCase().includes(searchTerm) ?? false)
      );
    }
    
    // Apply role filter
    if (this.roleFilter()) {
      filtered = filtered.filter(employee => employee.role === this.roleFilter());
    }
    
    // Apply status filter
    if (this.statusFilter()) {
      const isActive = this.statusFilter() === 'ACTIVE';
      filtered = filtered.filter(employee => employee.isActive === isActive);
    }

    // Apply department filter
    if (this.departmentFilter()) {
      filtered = filtered.filter(employee => employee.department === this.departmentFilter());
    }
    
    this.filteredEmployees.set(filtered);
    this.pageIndex.set(0); // Reset to first page when filters change
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.applyFilters();
  }

  onRoleFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.roleFilter.set(target.value);
    this.applyFilters();
  }

  onStatusFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.statusFilter.set(target.value);
    this.applyFilters();
  }

  onDepartmentFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.departmentFilter.set(target.value);
    this.applyFilters();
  }

  openCreateModal() {
    this.editingEmployee.set(null);
    this.sameAsPresentAddress.set(false);
    this.employeeForm.reset({
      role: UserRole.EMPLOYEE,
      employeeType: EmployeeType.FULL_TIME,
      isActive: true
    });
    this.showModal.set(true);
  }

  openEditModal(employee: Employee) {
    this.editingEmployee.set(employee);
    this.sameAsPresentAddress.set(false);
    this.employeeForm.patchValue({
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      gender: employee.gender || '',
      dateOfBirth: employee.dateOfBirth || '',
      dateOfJoining: employee.dateOfJoining,
      jobTitle: employee.jobTitle,
      role: employee.role,
      department: employee.department,
      employeeType: employee.employeeType,
      personalEmail: employee.personalEmail || '',
      workEmail: employee.workEmail,
      contactNumber: employee.contactNumber,
      emergencyContactNumber: employee.emergencyContactNumber || '',
      presentAddress: {
        addressLine1: employee.presentAddress?.addressLine1 || '',
        addressLine2: employee.presentAddress?.addressLine2 || '',
        city: employee.presentAddress?.city || '',
        state: employee.presentAddress?.state || '',
        country: employee.presentAddress?.country || '',
        zipCode: employee.presentAddress?.zipCode || ''
      },
      permanentAddress: {
        addressLine1: employee.permanentAddress?.addressLine1 || '',
        addressLine2: employee.permanentAddress?.addressLine2 || '',
        city: employee.permanentAddress?.city || '',
        state: employee.permanentAddress?.state || '',
        country: employee.permanentAddress?.country || '',
        zipCode: employee.permanentAddress?.zipCode || ''
      },
      isActive: employee.isActive
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
    this.employeeForm.reset();
  }

  closeProfileModal() {
    this.showProfileModal.set(false);
    this.selectedEmployee.set(null);
  }

  onSameAsPresentAddressChange(checked: boolean) {
    this.sameAsPresentAddress.set(checked);
    if (checked) {
      const presentAddress = this.employeeForm.get('presentAddress')?.value;
      this.employeeForm.get('permanentAddress')?.patchValue(presentAddress);
    }
  }

  onSubmit() {
    if (this.employeeForm.valid) {
      const formData = this.employeeForm.value;
      
      const employeeData = {
        employeeId: formData.employeeId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        dateOfJoining: formData.dateOfJoining,
        jobTitle: formData.jobTitle,
        role: formData.role,
        department: formData.department,
        employeeType: formData.employeeType,
        personalEmail: formData.personalEmail || undefined,
        workEmail: formData.workEmail,
        contactNumber: formData.contactNumber,
        emergencyContactNumber: formData.emergencyContactNumber || undefined,
        presentAddress: formData.presentAddress,
        permanentAddress: formData.permanentAddress,
        isActive: formData.isActive
      };

      if (this.editingEmployee()) {
        // Update existing employee
        this.employeesService.update(this.editingEmployee()!.userId, employeeData).subscribe({
          next: (updatedEmployee) => {
            console.log('Employee updated successfully:', updatedEmployee);
            this.toastr.success('Employee updated successfully');
            this.loadEmployees();
            this.closeModal();
          },
          error: (err) => {
            console.error('Failed to update employee:', err);
            this.toastr.error('Failed to update employee');
          }
        });
      } else {
        // Create new employee
        this.employeesService.create(employeeData).subscribe({
          next: (newEmployee) => {
            console.log('Employee created successfully:', newEmployee);
            this.toastr.success('Employee created successfully');
            this.loadEmployees();
            this.closeModal();
          },
          error: (err) => {
            console.error('Failed to create employee:', err);
            this.toastr.error('Failed to create employee');
          }
        });
      }
    }
  }

  deleteEmployee(employee: Employee) {
    if (confirm(`Are you sure you want to delete "${employee.firstName} ${employee.lastName}"? This action cannot be undone.`)) {
      this.employeesService.delete(employee.userId).subscribe({
        next: () => {
          this.toastr.success('Employee deleted successfully');
          this.loadEmployees();
        },
        error: (err) => {
          console.error('Failed to delete employee:', err);
          this.toastr.error('Failed to delete employee');
        }
      });
    }
  }

  // Pagination methods
  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.pageIndex.set(page);
    }
  }

  previousPage() {
    this.goToPage(this.pageIndex() - 1);
  }

  nextPage() {
    this.goToPage(this.pageIndex() + 1);
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.employeeForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.employeeForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Invalid email format';
      if (field.errors['maxlength']) return `${fieldName} must be ${field.errors['maxlength'].requiredLength} characters or less`;
    }
    return '';
  }

  // Status styling
  getStatusClass(isActive: boolean): string {
    return isActive ? 'bg-success' : 'bg-secondary';
  }

  getRoleClass(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-danger';
      case UserRole.APPROVER:
        return 'bg-warning';
      case UserRole.EMPLOYEE:
        return 'bg-primary';
      default:
        return 'bg-secondary';
    }
  }

  // Track by function for ngFor performance
  trackByEmployeeId(index: number, employee: Employee): string {
    return employee.userId;
  }

  // Get page numbers for pagination
  getPageNumbers(): number[] {
    const totalPages = this.totalPages();
    const currentPage = this.pageIndex();
    const pages: number[] = [];
    
    const start = Math.max(0, currentPage - 2);
    const end = Math.min(totalPages, start + 5);
    
    for (let i = start; i < end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Helper methods
  getFullName(employee: Employee): string {
    return `${employee.firstName} ${employee.lastName}`;
  }

  getAge(dateOfBirth?: string): number | null {
    if (!dateOfBirth) return null;
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
    const parts = [address.addressLine1];
    if (address.addressLine2) parts.push(address.addressLine2);
    parts.push(address.city);
    parts.push(address.state);
    parts.push(address.country);
    parts.push(address.zipCode);
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
}
