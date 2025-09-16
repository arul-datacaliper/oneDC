import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Observable, startWith, map, of } from 'rxjs';
import { TasksService, TaskStatus, ProjectTask, CreateTaskRequest, UpdateTaskRequest } from '../../../core/services/tasks.service';
import { UsersService, AppUser } from '../../../core/services/users.service';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <form [formGroup]="form" (ngSubmit)="submit()" class="task-form">
    <div class="row g-3">
      <div class="col-md-6">
        <label class="form-label">Title *</label>
        <input type="text" class="form-control" formControlName="title">
      </div>
      <div class="col-md-6">
        <label class="form-label">Assignee</label>
        <div class="dropdown">
          <input 
            type="text" 
            class="form-control dropdown-toggle" 
            formControlName="assigneeSearch"
            placeholder="Search or select assignee..."
            (input)="onAssigneeSearch($event)"
            (focus)="onAssigneeInputFocus()"
            (blur)="onInputBlur()"
            autocomplete="off">
          <div class="dropdown-menu w-100" [class.show]="showDropdown && (filteredUsers.length > 0 || searchText.length === 0)">
            <button 
              type="button" 
              class="dropdown-item" 
              (mousedown)="selectAssignee(null)"
              [class.active]="!selectedUser">
              <span class="text-muted">-- Unassigned --</span>
            </button>
            <button 
              *ngFor="let user of filteredUsers" 
              type="button" 
              class="dropdown-item" 
              (mousedown)="selectAssignee(user)"
              [class.active]="selectedUser?.userId === user.userId">
              {{ user.firstName }} {{ user.lastName }}
            </button>
            <div *ngIf="filteredUsers.length === 0 && searchText.length > 0" class="dropdown-item-text text-muted">
              No assignees found
            </div>
          </div>
        </div>
      </div>
      <div class="col-12">
        <label class="form-label">Description</label>
        <textarea rows="3" class="form-control" formControlName="description"></textarea>
      </div>
      <div class="col-md-6">
        <label class="form-label">Label</label>
        <input type="text" class="form-control" formControlName="label" placeholder="e.g., Bug, Feature, Enhancement">
      </div>
      <div class="col-md-6">
        <label class="form-label">Estimated Hours</label>
        <input type="number" step="0.25" class="form-control" formControlName="estimatedHours">
      </div>
      <div class="col-md-6">
        <label class="form-label">Start Date</label>
        <input type="date" class="form-control" formControlName="startDate">
      </div>
      <div class="col-md-6">
        <label class="form-label">End Date</label>
        <input type="date" class="form-control" formControlName="endDate">
      </div>
      <div class="col-md-6" *ngIf="mode==='edit'">
        <label class="form-label">Status</label>
        <select class="form-select" formControlName="status">
          <option value="NEW">New</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="BLOCKED">Blocked</option>
            <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
    </div>
    <div class="mt-4 d-flex justify-content-end gap-2">
      <button type="button" class="btn btn-outline-secondary" (click)="cancel.emit()">Cancel</button>
      <button type="submit" class="btn btn-primary" [disabled]="form.invalid">{{ mode==='create' ? 'Create' : 'Update' }}</button>
    </div>
  </form>
  `,
  styles: [`
    .task-form .form-label { font-weight: 500; }
    .dropdown {
      position: relative;
    }
    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 1000;
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #ced4da;
      border-radius: 0.375rem;
      background-color: white;
      box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    }
    .dropdown-item {
      display: block;
      width: 100%;
      padding: 0.375rem 0.75rem;
      clear: both;
      font-weight: 400;
      color: #212529;
      text-align: inherit;
      text-decoration: none;
      white-space: nowrap;
      background-color: transparent;
      border: 0;
      cursor: pointer;
    }
    .dropdown-item:hover, .dropdown-item:focus {
      color: #1e2125;
      background-color: #e9ecef;
    }
    .dropdown-item.active {
      color: #fff;
      background-color: #0d6efd;
    }
    .dropdown-item-text {
      display: block;
      padding: 0.375rem 0.75rem;
      margin-bottom: 0;
      font-size: 0.875rem;
      color: #6c757d;
      white-space: nowrap;
    }
  `]
})
export class TaskFormComponent {
  private fb = inject(FormBuilder);
  private usersSvc = inject(UsersService);
  private tasksSvc = inject(TasksService);

  @Input() projectId!: string;
  @Input() mode: 'create'|'edit' = 'create';
  @Input() task?: ProjectTask | null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  users: AppUser[] = [];
  filteredUsers: AppUser[] = [];
  selectedUser: AppUser | null = null;
  showDropdown = false;
  searchText = '';

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    label: [''],
    assigneeSearch: [''],
    assignedUserId: [''],
    estimatedHours: [null as number | null],
    startDate: [''],
    endDate: [''],
    status: ['NEW' as TaskStatus]
  });

  ngOnInit() {
    this.usersSvc.list(true).subscribe(u => {
      this.users = u;
      this.filteredUsers = u; // Show all users initially
      console.log('Users loaded:', u.length); // Debug log
      
      // Handle task editing after users are loaded
      if (this.task) {
        const assignedUser = this.users.find(user => user.userId === this.task!.assignedUserId);
        this.selectedUser = assignedUser || null;
        this.form.patchValue({
          title: this.task!.title,
          description: this.task!.description,
          label: this.task!.label,
          assigneeSearch: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : '',
          assignedUserId: this.task!.assignedUserId || '',
          estimatedHours: this.task!.estimatedHours ?? null,
          startDate: this.task!.startDate || '',
          endDate: this.task!.endDate || '',
          status: this.task!.status
        });
      }
    });

    // Listen to form control changes as backup
    this.form.get('assigneeSearch')?.valueChanges.subscribe(value => {
      if (typeof value === 'string') {
        console.log('Form control value changed:', value); // Debug log
        this.searchText = value;
        this.filteredUsers = this._filterUsers(value);
        if (this.showDropdown) {
          // Only update if dropdown is visible
          console.log('Updated filtered users from form control:', this.filteredUsers.length);
        }
      }
    });
    
    // Enable/disable status field based on mode
    if (this.mode === 'edit') {
      this.form.get('status')?.enable();
    } else {
      this.form.get('status')?.disable();
    }
  }

  submit() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const payload: any = {
      title: (v.title || '').toString().trim(),
      description: v.description?.trim() || undefined,
      label: v.label?.trim() || undefined,
      assignedUserId: v.assignedUserId || undefined,
      estimatedHours: v.estimatedHours ?? undefined,
      startDate: v.startDate || undefined,
      endDate: v.endDate || undefined,
    };
    if (this.mode === 'edit') payload.status = v.status;

    const obs = this.mode === 'create'
      ? this.tasksSvc.create(this.projectId, payload)
      : this.tasksSvc.update(this.task!.taskId, payload);

    obs.subscribe({
      next: () => this.saved.emit(),
      error: err => console.error('Task save failed', err)
    });
  }

  private _filterUsers(value: string): AppUser[] {
    if (!value || value.trim() === '') {
      return this.users;
    }
    const filterValue = value.toLowerCase().trim();
    return this.users.filter(user => 
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(filterValue) ||
      user.firstName.toLowerCase().includes(filterValue) ||
      user.lastName.toLowerCase().includes(filterValue)
    );
  }

  onAssigneeSearch(event: any) {
    const value = event.target.value;
    console.log('Search input:', value); // Debug log
    this.searchText = value;
    this.filteredUsers = this._filterUsers(value);
    this.showDropdown = true;
    console.log('Filtered users:', this.filteredUsers.length); // Debug log
  }

  onAssigneeInputFocus() {
    console.log('Input focused, showing all users:', this.users.length); // Debug log
    this.showDropdown = true;
    this.filteredUsers = this.users;
  }

  onInputBlur() {
    // Small delay to allow click on dropdown item
    setTimeout(() => {
      this.showDropdown = false;
    }, 150);
  }

  selectAssignee(user: AppUser | null) {
    this.selectedUser = user;
    this.showDropdown = false;
    
    if (user) {
      this.form.patchValue({
        assigneeSearch: `${user.firstName} ${user.lastName}`,
        assignedUserId: user.userId
      });
    } else {
      this.form.patchValue({
        assigneeSearch: '',
        assignedUserId: ''
      });
    }
  }
}
