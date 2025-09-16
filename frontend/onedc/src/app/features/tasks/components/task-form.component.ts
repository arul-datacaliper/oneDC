import { Component, EventEmitter, Input, Output, inject, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Observable, startWith, map, of } from 'rxjs';
import { TasksService, TaskStatus, ProjectTask, CreateTaskRequest, UpdateTaskRequest } from '../../../core/services/tasks.service';
import { UsersService, AppUser } from '../../../core/services/users.service';
import { SearchableDropdownComponent, DropdownOption } from '../../../shared/components/searchable-dropdown.component';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SearchableDropdownComponent],
  template: `
  <form [formGroup]="form" (ngSubmit)="submit()" class="task-form">
    <div class="row g-3">
      <div class="col-md-6">
        <label class="form-label">Title *</label>
        <input type="text" class="form-control" formControlName="title">
      </div>
      <div class="col-md-6">
        <label class="form-label">Assignee</label>
        <app-searchable-dropdown
          [options]="assigneeOptions"
          placeholder="Search or select assignee..."
          formControlName="assignedUserId"
          emptyLabel="-- Unassigned --"
          [searchFields]="['label']"
          (selectionChange)="onAssigneeChange($event)">
        </app-searchable-dropdown>
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
  `]
})
export class TaskFormComponent implements OnChanges {
  private fb = inject(FormBuilder);
  private usersSvc = inject(UsersService);
  private tasksSvc = inject(TasksService);

  @Input() projectId!: string;
  @Input() mode: 'create'|'edit' = 'create';
  @Input() task?: ProjectTask | null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

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
  });

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
    
    this.form.patchValue({
      title: this.task.title,
      description: this.task.description,
      label: this.task.label,
      assignedUserId: this.task.assignedUserId || '',
      estimatedHours: this.task.estimatedHours ?? null,
      startDate: this.task.startDate || '',
      endDate: this.task.endDate || '',
      status: this.task.status
    });
    
    // Ensure the dropdown gets the correct value after a brief delay
    setTimeout(() => {
      if (this.task?.assignedUserId) {
        this.form.get('assignedUserId')?.setValue(this.task.assignedUserId);
      }
    }, 100);
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

  onAssigneeChange(option: DropdownOption | null) {
    console.log('Assignee selected:', option);
    // The form control value is already updated by the component
    // We can add any additional logic here if needed
  }
}
