import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
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
        <select class="form-select" formControlName="assignedUserId">
          <option value="">-- Unassigned --</option>
          <option *ngFor="let u of users" [value]="u.userId">{{ u.firstName }} {{ u.lastName }}</option>
        </select>
      </div>
      <div class="col-12">
        <label class="form-label">Description</label>
        <textarea rows="3" class="form-control" formControlName="description"></textarea>
      </div>
      <div class="col-md-3">
        <label class="form-label">Estimated Hours</label>
        <input type="number" step="0.25" class="form-control" formControlName="estimatedHours">
      </div>
      <div class="col-md-3">
        <label class="form-label">Start Date</label>
        <input type="date" class="form-control" formControlName="startDate">
      </div>
      <div class="col-md-3">
        <label class="form-label">End Date</label>
        <input type="date" class="form-control" formControlName="endDate">
      </div>
      <div class="col-md-3" *ngIf="mode==='edit'">
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

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    assignedUserId: [''],
    estimatedHours: [null as number | null],
    startDate: [''],
    endDate: [''],
    status: ['NEW' as TaskStatus]
  });

  ngOnInit() {
    this.usersSvc.list(true).subscribe(u => this.users = u);
    if (this.task) {
      this.form.patchValue({
        title: this.task.title,
        description: this.task.description,
        assignedUserId: this.task.assignedUserId || '',
        estimatedHours: this.task.estimatedHours ?? null,
        startDate: this.task.startDate || '',
        endDate: this.task.endDate || '',
        status: this.task.status
      });
      if (this.mode === 'edit') {
        this.form.get('status')?.enable();
      }
    } else {
      if (this.mode === 'edit') {
        this.form.get('status')?.enable();
      } else {
        this.form.get('status')?.disable();
      }
    }
  }

  submit() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const payload: any = {
      title: (v.title || '').toString().trim(),
      description: v.description?.trim() || undefined,
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
}
