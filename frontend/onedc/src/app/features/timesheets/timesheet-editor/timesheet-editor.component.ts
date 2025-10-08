import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { TimesheetsService } from '../../../core/services/timesheets.service';
import { ProjectsService } from '../../../core/services/projects.service';
import { TasksService, ProjectTask } from '../../../core/services/tasks.service';
import { Project, TimesheetEntry, TaskType, getTaskTypes, getTaskTypeDisplayName } from '../../../shared/models';
import { SearchableDropdownComponent, DropdownOption } from '../../../shared/components/searchable-dropdown.component';


type Entry = {
  entryId: string;
  userId: string;
  projectId: string;
  workDate: string; // YYYY-MM-DD
  hours: number;
  description?: string;
  ticketRef?: string;
  taskType?: TaskType;
  taskId?: string; // added
  status: 'DRAFT'|'SUBMITTED'|'APPROVED'|'REJECTED'|'LOCKED';
};

@Component({
  selector: 'app-timesheet-editor',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, SearchableDropdownComponent
  ],
  templateUrl: './timesheet-editor.component.html',
  styleUrls: ['./timesheet-editor.component.scss']
})
export class TimesheetEditorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private tsSvc = inject(TimesheetsService);
  private projSvc = inject(ProjectsService);
  private toastr = inject(ToastrService);
  private tasksSvc = inject(TasksService);
  tasks = signal<ProjectTask[]>([]);
  private tasksByProject: Record<string, ProjectTask[]> = {};

  // Bootstrap-styled toast notification method
  private showNotification(message: string, action?: string, config?: any) {
    this.toastr.info(message, '', {
      timeOut: config?.duration || 3000,
      progressBar: true,
      positionClass: 'toast-top-right'
    });
  }

  // selected date (stored as UTC date string)
  selectedDate = signal(this.toUtcDateString(new Date()));
  
  // computed date range for API calls (same day for from/to)
  from = computed(() => this.selectedDate());
  to = computed(() => this.selectedDate());

  projects = signal<Project[]>([]);
  rows = signal<TimesheetEntry[]>([]);
  loading = signal(false);
  editingRowIndex = signal<number | null>(null); // Track which row is being edited
  displayed = ['date','project','hours','description','ticket','taskType','status','actions'];

  // Computed property for project dropdown options
  projectOptions = computed<DropdownOption[]>(() => {
    return this.projects().map(project => ({
      value: project.projectId,
      label: `${project.code} — ${project.name}`,
      searchableText: `${project.code} ${project.name}`.toLowerCase()
    }));
  });

  // Computed property for task dropdown options based on selected project
  taskOptions = computed<DropdownOption[]>(() => {
    const selectedProjectId = this.newRow.get('projectId')?.value;
    if (!selectedProjectId) return [];
    
    const tasks = this.getTasksForProject(selectedProjectId);
    return tasks.map(task => ({
      value: task.taskId,
      label: task.title,
      searchableText: task.title.toLowerCase()
    }));
  });

  // Task types for dropdown
  taskTypes = getTaskTypes();
  getTaskTypeDisplayName = getTaskTypeDisplayName;

  // forms
  form = this.fb.group({ items: this.fb.array<FormGroup>([]) });
  get items() { return this.form.get('items') as FormArray<FormGroup>; }

  // header add-row form
  newRow = this.fb.group({
    workDate: [new Date().toISOString().slice(0, 10)],
    projectId: ['', Validators.required],
    taskId: [''],
    hours: [0, [Validators.min(0), Validators.max(24)]],
    description: [''],
    ticketRef: [''],
    taskType: [TaskType.DEV, Validators.required]
  });

  onDateChange(event: any) {
    const newDateStr = event.target.value; // YYYY-MM-DD format
    if (newDateStr && newDateStr !== this.selectedDate()) {
      this.selectedDate.set(newDateStr);
      this.load(); // Refresh entries for the new date
    }
  }

  // computed totals
  totalHours = computed(() => this.items.controls.reduce((sum, g) => sum + (+g.get('hours')!.value || 0), 0));
  
  // Daily total for the selected date
  dailyTotal = computed(() => {
    const dateStr = this.selectedDate();
    
    // Calculate from the rows signal (actual data from backend) instead of form controls
    // This ensures we get the saved values, not the form values
    return this.rows()
      .filter(row => row.workDate === dateStr)
      .reduce((sum, row) => sum + (row.hours || 0), 0);
  });

  ngOnInit(): void {
    console.log('TimesheetEditorComponent: Initializing...'); // Debug log
    this.loadProjects();
    this.load();
    this.updateNewRowDate();
    this.newRow.get('workDate')?.valueChanges.subscribe(newDate => {
      if (newDate && typeof newDate === 'string' && newDate !== this.selectedDate()) {
        this.selectedDate.set(newDate);
        this.load();
      }
    });
    this.newRow.get('projectId')?.valueChanges.subscribe(pid => {
      if (pid) this.loadTasksForProject(pid);
    });
  }

  updateNewRowDate() {
    const selectedDateStr = this.selectedDate();
    // Use the UTC date string directly for the date input (YYYY-MM-DD format)
    this.newRow.patchValue({ workDate: selectedDateStr }, { emitEvent: false });
  }

  loadProjects() {
    this.projSvc.getAll().subscribe({
      next: (ps: any[]) => {
        console.log('Loaded projects:', ps); // Debug log
        // Filter only active projects
        const activeProjects = ps.filter((p: any) => p.status === 'ACTIVE' || !p.status);
        this.projects.set(activeProjects);
      },
      error: (err) => {
        console.error('Failed to load projects:', err);
                this.showNotification('Failed to load projects', 'error');
        // Set some mock data for development
        this.projects.set([
          { projectId: '1', clientId: 'client1', code: 'DEMO', name: 'Demo Project', status: 'ACTIVE', billable: true },
          { projectId: '2', clientId: 'client1', code: 'INTERNAL', name: 'Internal Work', status: 'ACTIVE', billable: false }
        ] as Project[]);
      }
    });
  }

  load() {
    console.log('Loading timesheets for date:', this.selectedDate()); // Debug log
    this.loading.set(true);
    
    this.tsSvc.list(this.from(), this.to()).subscribe({
      next: (data: any[]) => {
        console.log('Loaded timesheets:', data); // Debug log
        this.rows.set(data as TimesheetEntry[]);
        
        // rebuild form array
        this.items.clear();
        this.rows().forEach((r: TimesheetEntry) => this.items.push(this.buildRow(r)));
        
        // Load tasks for all projects in the timesheet entries
        this.loadTasksForCurrentProjects();
        
        this.loading.set(false);
        
        if (data.length === 0) {
          console.log('No timesheet entries found for this date');
        } else {
          console.log(`Loaded ${data.length} timesheet entries for ${this.selectedDate()}`);
        }
      },
      error: (err) => {
        console.error('Failed to load timesheets:', err);
        this.loading.set(false);
        this.showNotification('Failed to load timesheets. Please check your connection.', 'error');
      }
    });
  }

  private loadTasksForCurrentProjects() {
    const projectIds = Array.from(new Set(this.rows().map(r => r.projectId)));
    projectIds.forEach(pid => this.loadTasksForProject(pid));
  }

  private loadTasksForProject(projectId: string) {
    if (!projectId) return;
    if (this.tasksByProject[projectId]) return; // cache
    this.tasksSvc.list(projectId).subscribe(response => {
      this.tasksByProject[projectId] = response.tasks;
      if (projectId === this.newRow.get('projectId')?.value) {
        // trigger change detection if needed
        this.tasks.set(response.tasks);
      }
    });
  }

  getTasksForProject(projectId: string | null | undefined): ProjectTask[] {
    if (!projectId) return [];
    return this.tasksByProject[projectId] || [];
  }

  // Get task options for a specific project (used in edit mode)
  getTaskOptionsForProject(projectId: string | null | undefined): DropdownOption[] {
    if (!projectId) return [];
    
    // Ensure tasks are loaded for this project
    if (!this.tasksByProject[projectId]) {
      this.loadTasksForProject(projectId);
      return [];
    }
    
    const tasks = this.getTasksForProject(projectId);
    return tasks.map(task => ({
      value: task.taskId,
      label: task.title,
      searchableText: task.title.toLowerCase()
    }));
  }

  buildRow(r: TimesheetEntry) {
    const g = this.fb.group({
      entryId: [r.entryId],
      workDate: [r.workDate, Validators.required],
      projectId: [r.projectId, Validators.required],
      taskId: [r.taskId || ''],
      hours: [r.hours, [Validators.required, Validators.min(0), Validators.max(24)]],
      description: [r.description ?? ''],
      ticketRef: [r.ticketRef ?? ''],
      taskType: [r.taskType ?? TaskType.DEV, Validators.required],
      status: [r.status],
      dirty: [false]
    });

    // mark dirty when user edits
    g.valueChanges.subscribe(() => {
      g.get('dirty')!.setValue(true, { emitEvent: false });
    });
    return g;
  }

  addRow() : void {
    console.log('addRow: Starting...'); // Debug log
    const val = this.newRow.value;
    console.log('addRow: Form value:', val); // Debug log
    
    // validations
    const hours = Number(val.hours ?? 0);
    if (!val.workDate || !val.projectId) {
      this.showNotification('Select date and project', 'OK', { duration: 2000 });
      return;
    }
    if (hours < 0 || hours > 24) {
      this.showNotification('Hours must be between 0 and 24', 'OK', { duration: 2000 });
      return;
    }
    if (hours > 0 && !val.description?.trim()) {
      this.showNotification('Description required when hours > 0', 'OK', { duration: 2000 });
      return;
    }

    const dto = {
      projectId: val.projectId!,
      workDate: val.workDate as string, // Already in YYYY-MM-DD format
      hours,
      description: val.description?.trim() || undefined,
      ticketRef: val.ticketRef?.trim() || undefined,
      taskType: val.taskType ?? TaskType.DEV,
      taskId: val.taskId || undefined
    };

    console.log('addRow: DTO to send:', dto); // Debug log

    this.tsSvc.create(dto).subscribe({
      next: (created: any) => {
        console.log('addRow: Created entry:', created); // Debug log
        this.showNotification('Draft entry created', 'OK', { duration: 1500 });
        this.newRow.reset({
          workDate: this.selectedDate(), // Already in YYYY-MM-DD format
          projectId: '',
          taskId: '',
          hours: 0,
          description: '',
          ticketRef: '',
          taskType: TaskType.DEV
        });
        
        // Instead of manually adding to rows/items, reload the data to ensure consistency
        console.log('addRow: Reloading data to ensure UI consistency'); // Debug log
        this.load();
      },
      error: err => {
        console.error('addRow: Error creating entry:', err); // Debug log
        
        // Handle specific error messages
        let errorMessage = 'Failed to create entry';
        if (err?.error?.includes && err.error.includes('Daily cap exceeded')) {
          errorMessage = 'Daily limit exceeded! You can only log up to 12 hours per day.';
        } else if (err?.message) {
          errorMessage = err.message;
        } else if (err?.error) {
          errorMessage = err.error;
        }
        
        this.showNotification(errorMessage, 'OK', { duration: 4000 });
      }
    });
  }

  saveRow(ix: number) {
    const g = this.items.at(ix);
    if (!g) return;
    if (!this.isEditable(g.get('status')!.value)) {
      this.showNotification('Only DRAFT and REJECTED entries can be edited', 'OK', { duration: 2000 });
      return;
    }
    const hours = Number(g.get('hours')!.value);
    if (hours > 0 && !(g.get('description')!.value || '').trim()) {
      this.showNotification('Description required when hours > 0', 'OK', { duration: 2000 });
      return;
    }
    const id = g.get('entryId')!.value as string;
    const body = {
      hours,
      description: (g.get('description')!.value || '').trim(),
      ticketRef: (g.get('ticketRef')!.value || '').trim(),
      taskType: g.get('taskType')!.value ?? TaskType.DEV,
      taskId: (g.get('taskId')!.value || undefined)
    };
    this.tsSvc.update(id, body).subscribe({
      next: (updated: any) => {
        g.patchValue({ 
          dirty: false, 
          hours: updated.hours, 
          description: updated.description ?? '', 
          ticketRef: updated.ticketRef ?? '',
          taskType: updated.taskType ?? TaskType.DEV,
          taskId: updated.taskId || ''
        }, { emitEvent: false });
        
        // Update the rows signal to reflect the saved changes
        this.rows.update(rows => rows.map(row => 
          row.entryId === id 
            ? { 
                ...row, 
                hours: updated.hours, 
                description: updated.description ?? '', 
                ticketRef: updated.ticketRef ?? '',
                taskType: updated.taskType ?? TaskType.DEV,
                taskId: updated.taskId || ''
              }
            : row
        ));
        
        this.showNotification('Saved', 'OK', { duration: 1200 });
        this.exitEditMode(); // Exit edit mode after successful save
      },
      error: err => this.showNotification(err?.error ?? 'Save failed', 'OK', { duration: 2500 })
    });
  }

  submitRow(ix: number) {
    const g = this.items.at(ix);
    if (!g) return;
    if (!this.isEditable(g.get('status')!.value)) {
      this.showNotification('Only DRAFT and REJECTED entries can be submitted', 'OK', { duration: 2000 });
      return;
    }
    const id = g.get('entryId')!.value as string;
    this.tsSvc.submit(id).subscribe({
      next: (res: any) => {
        g.patchValue({ status: res.status, dirty: false }, { emitEvent: false });
        
        // Update the rows signal to reflect the status change
        this.rows.update(rows => rows.map(row => 
          row.entryId === id 
            ? { ...row, status: res.status || res.Status || 'SUBMITTED' }
            : row
        ));
        
        this.showNotification('Submitted for approval', 'OK', { duration: 1500 });
      },
      error: err => this.showNotification(err?.error ?? 'Submit failed', 'OK', { duration: 2500 })
    });
  }

  // (optional) delete a DRAFT or REJECTED row
  deleteRow(ix: number) {
    const g = this.items.at(ix);
    if (!g) return;
    if (!this.isEditable(g.get('status')!.value)) {
      this.showNotification('Only DRAFT and REJECTED entries can be deleted', 'OK', { duration: 2000 });
      return;
    }
    const id = g.get('entryId')!.value as string;
    if (!confirm('Delete this draft entry?')) return;
    this.tsSvc.delete(id).subscribe({
      next: () => {
        this.items.removeAt(ix);
        
        // Update the rows signal to remove the deleted entry
        this.rows.update(rows => rows.filter(row => row.entryId !== id));
        
        this.showNotification('Deleted', 'OK', { duration: 1200 });
      },
      error: err => this.showNotification(err?.error ?? 'Delete failed', 'OK', { duration: 2500 })
    });
  }

  // date navigation helpers
  prevDay() { 
    const selectedDateStr = this.selectedDate();
    const utcDate = this.utcDateStringToUtcDate(selectedDateStr);
    utcDate.setUTCDate(utcDate.getUTCDate() - 1); 
    this.selectedDate.set(this.toUtcDateString(utcDate)); 
    this.updateNewRowDate();
    this.load(); 
  }
  
  nextDay() { 
    const selectedDateStr = this.selectedDate();
    const utcDate = this.utcDateStringToUtcDate(selectedDateStr);
    utcDate.setUTCDate(utcDate.getUTCDate() + 1); 
    this.selectedDate.set(this.toUtcDateString(utcDate)); 
    this.updateNewRowDate();
    this.load(); 
  }

  // UTC Date handling methods
  
  /**
   * Converts a local Date object to UTC date string (YYYY-MM-DD)
   * This treats the input as a "date" rather than a timestamp
   */
  toUtcDateString(localDate: Date): string {
    // Create a new date in UTC using the local date components
    // This ensures the "date" is preserved regardless of timezone
    const utcDate = new Date(Date.UTC(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate()
    ));
    return utcDate.toISOString().slice(0, 10);
  }

  /**
   * Converts a UTC date string (YYYY-MM-DD) to a local Date object
   * for use in date pickers and UI components
   */
  utcDateStringToLocal(utcDateString: string): Date {
    const [year, month, day] = utcDateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-based in local dates
  }

  /**
   * Converts a UTC date string to a UTC Date object
   * for date calculations
   */
  utcDateStringToUtcDate(utcDateString: string): Date {
    return new Date(utcDateString + 'T00:00:00.000Z');
  }

  /**
   * Legacy method for compatibility - now uses UTC
   * @deprecated Use toUtcDateString instead
   */
  iso(d: Date): string { 
    return this.toUtcDateString(d);
  }

  projectLabel(id: string) {
    const p = this.projects().find(x => x.projectId === id);
    return p ? `${p.code} — ${p.name}` : id;
  }

  statusLabel(status: any) {
    // Handle both numeric and string status values
    if (typeof status === 'number') {
      switch (status) {
        case 0: return 'DRAFT';
        case 1: return 'SUBMITTED'; 
        case 2: return 'APPROVED';
        case 3: return 'REJECTED';
        case 4: return 'LOCKED';
        default: return 'UNKNOWN';
      }
    }
    return status || 'DRAFT';
  }

  statusClass(status: any) {
    const statusText = this.statusLabel(status);
    return {
      'bg-secondary': statusText === 'DRAFT',
      'bg-warning': statusText === 'SUBMITTED',
      'bg-success': statusText === 'APPROVED',
      'bg-info': statusText === 'LOCKED',
      'bg-danger': statusText === 'REJECTED'
    };
  }

  isDraft(status: any) {
    return this.statusLabel(status) === 'DRAFT';
  }

  // Allow editing for both DRAFT and REJECTED entries
  isEditable(status: any) {
    const statusText = this.statusLabel(status);
    return statusText === 'DRAFT' || statusText === 'REJECTED';
  }

  onFieldChange(formGroup: FormGroup, fieldName: string, value: any) {
    formGroup.get(fieldName)!.setValue(value);
    formGroup.get('dirty')!.setValue(true, { emitEvent: false });
  }

  // Enter edit mode for a specific row
  enterEditMode(index: number) {
    const g = this.items.at(index);
    if (!g || !this.isEditable(g.get('status')!.value)) {
      this.showNotification('Only DRAFT and REJECTED entries can be edited', 'OK', { duration: 2000 });
      return;
    }
    this.editingRowIndex.set(index);
  }

  // Exit edit mode
  exitEditMode() {
    this.editingRowIndex.set(null);
  }

  // Check if a specific row is in edit mode
  isRowInEditMode(index: number): boolean {
    return this.editingRowIndex() === index;
  }

  getTaskTitle(projectId: string | null | undefined, taskId: string | null | undefined): string {
    if (!taskId || !projectId) return 'No task selected';
    
    // If tasks aren't loaded for this project yet, try to load them
    if (!this.tasksByProject[projectId]) {
      this.loadTasksForProject(projectId);
      return 'Loading...';
    }
    
    const tasks = this.getTasksForProject(projectId);
    const task = tasks.find(t => t.taskId === taskId);
    return task ? task.title : 'Task not found';
  }
}
