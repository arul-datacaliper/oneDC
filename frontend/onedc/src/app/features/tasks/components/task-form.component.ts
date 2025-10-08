import { Component, EventEmitter, Input, Output, inject, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, startWith, map, of } from 'rxjs';
import { TasksService, TaskStatus, ProjectTask, CreateTaskRequest, UpdateTaskRequest } from '../../../core/services/tasks.service';
import { UsersService, AppUser } from '../../../core/services/users.service';
import { SearchableDropdownComponent, DropdownOption } from '../../../shared/components/searchable-dropdown.component';

// Custom validator for date range
function dateRangeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const startDate = control.get('startDate')?.value;
    const endDate = control.get('endDate')?.value;
    
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return { dateRange: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchableDropdownComponent],
  template: `
  <form [formGroup]="form" (ngSubmit)="submit()" class="task-form">
    <div class="row g-3">
      <div class="col-md-6">
        <label class="form-label">Title *</label>
        <input type="text" class="form-control" formControlName="title" [readonly]="mode === 'view'">
      </div>
      <div class="col-md-6">
        <label class="form-label">Assignee</label>
        <app-searchable-dropdown
          *ngIf="mode !== 'view'"
          [options]="assigneeOptions"
          placeholder="Search or select assignee..."
          formControlName="assignedUserId"
          emptyLabel="-- Unassigned --"
          [searchFields]="['label']"
          (selectionChange)="onAssigneeChange($event)">
        </app-searchable-dropdown>
        <input 
          *ngIf="mode === 'view'" 
          type="text" 
          class="form-control" 
          [value]="getAssigneeName()" 
          readonly>
      </div>
      <div class="col-12">
        <label class="form-label">Description</label>
        <textarea rows="3" class="form-control" formControlName="description" [readonly]="mode === 'view'"></textarea>
      </div>
      <div class="col-md-6">
        <label class="form-label">Label</label>
        <input type="text" class="form-control" formControlName="label" placeholder="e.g., Bug, Feature, Enhancement" [readonly]="mode === 'view'">
      </div>
      <div class="col-md-6">
        <label class="form-label">Estimated Hours</label>
        <input type="number" step="0.25" class="form-control" formControlName="estimatedHours" [readonly]="mode === 'view'">
      </div>
      <div class="col-md-6">
        <label class="form-label">Start Date</label>
        <input type="date" class="form-control" formControlName="startDate" [readonly]="mode === 'view'">
      </div>
      <div class="col-md-6">
        <label class="form-label">End Date</label>
        <input type="date" class="form-control" formControlName="endDate" [readonly]="mode === 'view'">
      </div>
      <!-- Date validation error message -->
      <div class="col-12" *ngIf="form.hasError('dateRange') && (form.get('startDate')?.touched || form.get('endDate')?.touched)">
        <div class="alert alert-danger py-2">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          End date must be after start date.
        </div>
      </div>
      <div class="col-md-6" *ngIf="mode==='edit' || mode==='view'">
        <label class="form-label">Status</label>
        <select class="form-select" formControlName="status" *ngIf="mode === 'edit'">
          <option value="NEW">New</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="BLOCKED">Blocked</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <input 
          *ngIf="mode === 'view'" 
          type="text" 
          class="form-control" 
          [value]="getStatusLabel()" 
          readonly>
      </div>
    </div>
    <div class="mt-4 d-flex justify-content-end gap-2">
      <button type="button" class="btn btn-outline-secondary" (click)="cancel.emit()" [disabled]="saving">
        {{ mode === 'view' ? 'Close' : 'Cancel' }}
      </button>
      <button 
        *ngIf="mode !== 'view'" 
        type="submit" 
        class="btn btn-primary" 
        [disabled]="form.invalid || saving">
        <span *ngIf="saving" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        {{ saving ? 'Saving...' : (mode==='create' || mode==='duplicate' ? 'Create' : 'Update') }}
      </button>
    </div>
  </form>
  `,
  styles: [`
    .task-form .form-label { 
      font-weight: 500; 
    }
    .task-form input[readonly], 
    .task-form textarea[readonly] {
      background-color: #f8f9fa;
      border-color: #e9ecef;
      cursor: not-allowed;
    }
    .task-form input[readonly]:focus,
    .task-form textarea[readonly]:focus {
      background-color: #f8f9fa;
      border-color: #e9ecef;
      box-shadow: none;
    }
  `]
})
export class TaskFormComponent implements OnChanges {
  private fb = inject(FormBuilder);
  private usersSvc = inject(UsersService);
  private tasksSvc = inject(TasksService);

  @Input() projectId!: string;
  @Input() mode: 'create'|'edit'|'duplicate'|'view' = 'create';
  @Input() task?: ProjectTask | null;
  @Input() saving: boolean = false;
  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() loadingChange = new EventEmitter<boolean>();

  users: AppUser[] = [];
  assigneeOptions: DropdownOption[] = [];

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    label: [''],
    assignedUserId: [''],
    estimatedHours: [null as number | null],
    startDate: [''],
    endDate: [''],
    status: ['NEW' as TaskStatus]
  }, { validators: [dateRangeValidator()] });

  ngOnInit() {
    this.usersSvc.list(true).subscribe(u => {
      this.users = u;
      this.assigneeOptions = u.map(user => ({
        value: user.userId,
        label: `${user.firstName} ${user.lastName}`,
        user: user // Keep reference to original user object
      }));
      console.log('Users loaded:', u.length); // Debug log
      
      // Handle task editing after users are loaded
      if (this.task) {
        this.populateForm();
      }
    });
    
    // Enable/disable status field based on mode
    if (this.mode === 'edit') {
      this.form.get('status')?.enable();
    } else {
      this.form.get('status')?.disable();
    }
  }

  ngOnChanges() {
    // Handle task changes when component is reused
    if (this.task && this.assigneeOptions.length > 0) {
      this.populateForm();
    }
  }

  private populateForm() {
    if (!this.task) return;
    
    console.log('Populating form with task:', this.task); // Debug log
    
    // Convert dates to proper format for date inputs
    const formatDateForInput = (dateStr: string | undefined) => {
      if (!dateStr) return '';
      // Handle both Date objects and date strings
      if (typeof dateStr === 'string') {
        // If it's already in YYYY-MM-DD format, use it directly
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return dateStr;
        }
        // If it's an ISO string, extract the date part
        if (dateStr.includes('T')) {
          return dateStr.split('T')[0];
        }
      }
      // Fallback: create date and format
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    };
    
    // For duplicate mode, clear assignee and estimated hours to allow reassignment
    const isDuplicate = this.mode === 'duplicate';
    
    this.form.patchValue({
      title: this.task.title,
      description: this.task.description,
      label: this.task.label,
      assignedUserId: isDuplicate ? '' : (this.task.assignedUserId || ''),
      estimatedHours: isDuplicate ? null : (this.task.estimatedHours ?? null),
      startDate: formatDateForInput(this.task.startDate),
      endDate: formatDateForInput(this.task.endDate),
      status: isDuplicate ? 'NEW' : this.task.status
    });
    
    console.log('Form values after patch:', this.form.value); // Debug log
    
    // Ensure the dropdown gets the correct value after a brief delay
    setTimeout(() => {
      if (this.task?.assignedUserId) {
        this.form.get('assignedUserId')?.setValue(this.task.assignedUserId);
      }
    }, 100);
  }

  getAssigneeName(): string {
    if (!this.task?.assignedUserId) return '-- Unassigned --';
    const assignee = this.assigneeOptions.find(opt => opt.value === this.task?.assignedUserId);
    return assignee?.label || '-- Unknown --';
  }

  getStatusLabel(): string {
    const statusLabels: Record<string, string> = {
      'NEW': 'New',
      'IN_PROGRESS': 'In Progress',
      'BLOCKED': 'Blocked',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled'
    };
    return statusLabels[this.task?.status || ''] || this.task?.status || 'Unknown';
  }

  submit() {
    if (this.mode === 'view' || this.form.invalid || this.saving) return;
    
    this.loadingChange.emit(true);
    
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

    const obs = (this.mode === 'create' || this.mode === 'duplicate')
      ? this.tasksSvc.create(this.projectId, payload)
      : this.tasksSvc.update(this.task!.taskId, payload);

    obs.subscribe({
      next: () => {
        this.loadingChange.emit(false);
        this.saved.emit();
      },
      error: err => {
        this.loadingChange.emit(false);
        console.error('Task save failed', err);
      }
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

  onAssigneeChange(option: DropdownOption | null) {
    console.log('Assignee selected:', option);
    // The form control value is already updated by the component
    // We can add any additional logic here if needed
  }
}
