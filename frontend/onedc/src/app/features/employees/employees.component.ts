import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { UserManagementService, AppUser, UserRole, CreateUserRequest, UpdateUserRequest } from '../../core/services/user-management.service';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule],
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.scss'
})
export class EmployeesComponent implements OnInit {
  private userService = inject(UserManagementService);
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);

  // Make Math available in template
  Math = Math;

  // Signals for reactive state management
  employees = signal<AppUser[]>([]);
  filteredEmployees = signal<AppUser[]>([]);
  loading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  editingEmployee = signal<AppUser | null>(null);
  searchTerm = signal<string>('');
  roleFilter = signal<string>('');
  statusFilter = signal<string>('');
  
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
  adminEmployees = computed(() => this.employees().filter(e => e.role === UserRole.ADMIN || e.role === 'ADMIN').length);
  approverEmployees = computed(() => this.employees().filter(e => e.role === UserRole.APPROVER || e.role === 'APPROVER').length);
  employeeRoles = computed(() => this.employees().filter(e => e.role === UserRole.EMPLOYEE || e.role === 'EMPLOYEE').length);

  // Form
  employeeForm: FormGroup;

  // Available roles
  availableRoles = [
    { value: UserRole.ADMIN, label: 'Admin' },
    { value: UserRole.APPROVER, label: 'Approver' },
    { value: UserRole.EMPLOYEE, label: 'Employee' }
  ];

  constructor() {
    this.employeeForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: [UserRole.EMPLOYEE, Validators.required],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.loadEmployees();
  }

  private loadEmployees() {
    this.loading.set(true);
    this.userService.getUsers().subscribe({
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
        employee.email.toLowerCase().includes(searchTerm)
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
    
    this.filteredEmployees.set(filtered);
    this.pageIndex.set(0); // Reset to first page when filters change
  }

  // Event handlers
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

  // Modal management
  openCreateModal() {
    this.employeeForm.reset({
      role: UserRole.EMPLOYEE,
      isActive: true
    });
    this.editingEmployee.set(null);
    this.showModal.set(true);
  }

  openEditModal(employee: AppUser) {
    this.employeeForm.patchValue({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      role: employee.role,
      isActive: employee.isActive
    });
    this.editingEmployee.set(employee);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingEmployee.set(null);
    this.employeeForm.reset();
  }

  // Form submission
  onSubmit() {
    if (this.employeeForm.valid) {
      const formValue = this.employeeForm.value;
      
      if (this.editingEmployee()) {
        // Update existing employee
        const updateData: UpdateUserRequest = {
          firstName: formValue.firstName,
          lastName: formValue.lastName,
          role: formValue.role,
          isActive: formValue.isActive
        };
        
        this.userService.updateUser(this.editingEmployee()!.userId, updateData).subscribe({
          next: () => {
            this.toastr.success('Employee updated successfully');
            this.closeModal();
            this.loadEmployees();
          },
          error: (error) => {
            this.toastr.error('Error updating employee');
            console.error('Error updating employee:', error);
          }
        });
      } else {
        // Create new employee
        const createData: CreateUserRequest = {
          firstName: formValue.firstName,
          lastName: formValue.lastName,
          email: formValue.email,
          role: formValue.role
        };
        
        this.userService.createUser(createData).subscribe({
          next: () => {
            this.toastr.success('Employee created successfully');
            this.closeModal();
            this.loadEmployees();
          },
          error: (error) => {
            this.toastr.error('Error creating employee');
            console.error('Error creating employee:', error);
          }
        });
      }
    }
  }

  // Delete employee
  deleteEmployee(employee: AppUser) {
    if (confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`)) {
      this.userService.deleteUser(employee.userId).subscribe({
        next: () => {
          this.toastr.success('Employee deleted successfully');
          this.loadEmployees();
        },
        error: (error) => {
          this.toastr.error('Error deleting employee');
          console.error('Error deleting employee:', error);
        }
      });
    }
  }

  // Toggle employee status
  toggleEmployeeStatus(employee: AppUser) {
    const newStatus = !employee.isActive;
    const updateData: UpdateUserRequest = {
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: employee.role as UserRole,
      isActive: newStatus
    };
    
    this.userService.updateUser(employee.userId, updateData).subscribe({
      next: () => {
        this.toastr.success(`Employee ${newStatus ? 'activated' : 'deactivated'} successfully`);
        this.loadEmployees();
      },
      error: (error) => {
        this.toastr.error('Error updating employee status');
        console.error('Error updating employee status:', error);
      }
    });
  }

  // Pagination
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

  // Utility methods
  getRoleBadgeClass(role: string | UserRole): string {
    const roleStr = typeof role === 'string' ? role : UserRole[role];
    switch (roleStr) {
      case 'ADMIN': return 'badge bg-danger';
      case 'APPROVER': return 'badge bg-primary';
      case 'EMPLOYEE': return 'badge bg-success';
      default: return 'badge bg-secondary';
    }
  }

  getRoleDisplayName(role: string | UserRole): string {
    const roleStr = typeof role === 'string' ? role : UserRole[role];
    switch (roleStr) {
      case 'ADMIN': return 'Admin';
      case 'APPROVER': return 'Approver';
      case 'EMPLOYEE': return 'Employee';
      default: return 'Unknown';
    }
  }

  getStatusBadgeClass(isActive: boolean): string {
    return isActive ? 'badge bg-success' : 'badge bg-secondary';
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
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
    }
    return '';
  }
}
