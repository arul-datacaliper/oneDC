import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

import { UserManagementService, AppUser, CreateUserRequest, UpdateUserRequest, UserRole } from '../../../core/services/user-management.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit {
  private userService = inject(UserManagementService);
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);

  // Signals for reactive state
  users = signal<AppUser[]>([]);
  loading = signal<boolean>(false);
  showCreateModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  editingUser = signal<AppUser | null>(null);

  // Forms
  createUserForm!: FormGroup;
  editUserForm!: FormGroup;

  // Computed properties
  activeUsers = computed(() => this.users().filter(u => u.isActive));
  inactiveUsers = computed(() => this.users().filter(u => !u.isActive));
  userRoles = computed(() => this.userService.getUserRoles());

  ngOnInit() {
    this.initializeForms();
    this.loadUsers();
  }

  private initializeForms() {
    this.createUserForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      role: [UserRole.EMPLOYEE, Validators.required]
    });

    this.editUserForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      role: [UserRole.EMPLOYEE, Validators.required],
      isActive: [true]
    });
  }

  async loadUsers() {
    try {
      this.loading.set(true);
      this.userService.getUsers().subscribe({
        next: (users) => {
          this.users.set(users);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.toastr.error('Failed to load users');
          this.loading.set(false);
        }
      });
    } catch (error) {
      console.error('Error loading users:', error);
      this.toastr.error('Failed to load users');
      this.loading.set(false);
    }
  }

  // Create user modal
  openCreateModal() {
    this.createUserForm.reset();
    this.createUserForm.patchValue({ role: UserRole.EMPLOYEE });
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.createUserForm.reset();
  }

  async createUser() {
    if (this.createUserForm.valid) {
      try {
        this.loading.set(true);
        const request: CreateUserRequest = this.createUserForm.value;
        
        this.userService.createUser(request).subscribe({
          next: (newUser) => {
            this.users.update(users => [...users, newUser]);
            this.toastr.success('User created successfully');
            this.closeCreateModal();
            this.loading.set(false);
          },
          error: (error) => {
            console.error('Error creating user:', error);
            this.toastr.error('Failed to create user');
            this.loading.set(false);
          }
        });
      } catch (error) {
        console.error('Error creating user:', error);
        this.toastr.error('Failed to create user');
        this.loading.set(false);
      }
    }
  }

  // Edit user modal
  openEditModal(user: AppUser) {
    this.editingUser.set(user);
    this.editUserForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive
    });
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingUser.set(null);
    this.editUserForm.reset();
  }

  async updateUser() {
    if (this.editUserForm.valid && this.editingUser()) {
      try {
        this.loading.set(true);
        const request: UpdateUserRequest = this.editUserForm.value;
        const userId = this.editingUser()!.userId;
        
        this.userService.updateUser(userId, request).subscribe({
          next: (updatedUser) => {
            this.users.update(users => 
              users.map(u => u.userId === userId ? updatedUser : u)
            );
            this.toastr.success('User updated successfully');
            this.closeEditModal();
            this.loading.set(false);
          },
          error: (error) => {
            console.error('Error updating user:', error);
            this.toastr.error('Failed to update user');
            this.loading.set(false);
          }
        });
      } catch (error) {
        console.error('Error updating user:', error);
        this.toastr.error('Failed to update user');
        this.loading.set(false);
      }
    }
  }

  async toggleUserStatus(user: AppUser) {
    try {
      this.userService.toggleUserStatus(user.userId).subscribe({
        next: () => {
          this.users.update(users => 
            users.map(u => 
              u.userId === user.userId 
                ? { ...u, isActive: !u.isActive }
                : u
            )
          );
          this.toastr.success(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
        },
        error: (error) => {
          console.error('Error toggling user status:', error);
          this.toastr.error('Failed to update user status');
        }
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      this.toastr.error('Failed to update user status');
    }
  }

  async deleteUser(user: AppUser) {
    if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      try {
        this.userService.deleteUser(user.userId).subscribe({
          next: () => {
            this.users.update(users => users.filter(u => u.userId !== user.userId));
            this.toastr.success('User deleted successfully');
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            this.toastr.error('Failed to delete user');
          }
        });
      } catch (error) {
        console.error('Error deleting user:', error);
        this.toastr.error('Failed to delete user');
      }
    }
  }

  // Utility methods
  getRoleDisplayName(role: UserRole): string {
    return this.userService.getRoleDisplayName(role);
  }

  getRoleBadgeClass(role: UserRole): string {
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

  isFieldInvalid(form: FormGroup, field: string): boolean {
    const fieldControl = form.get(field);
    return !!(fieldControl && fieldControl.invalid && (fieldControl.dirty || fieldControl.touched));
  }

  getFieldError(form: FormGroup, field: string): string {
    const fieldControl = form.get(field);
    if (fieldControl?.errors) {
      if (fieldControl.errors['required']) {
        return `${field} is required`;
      }
      if (fieldControl.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (fieldControl.errors['minlength']) {
        return `${field} must be at least ${fieldControl.errors['minlength'].requiredLength} characters`;
      }
    }
    return '';
  }
}
