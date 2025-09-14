import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { TimesheetsService } from '../../../core/services/timesheets.service';
import { ProjectsService } from '../../../core/services/projects.service';
import { Project, TimesheetEntry } from '../../../shared/models';


type Entry = {
  entryId: string;
  userId: string;
  projectId: string;
  workDate: string; // YYYY-MM-DD
  hours: number;
  description?: string;
  ticketRef?: string;
  status: 'DRAFT'|'SUBMITTED'|'APPROVED'|'REJECTED'|'LOCKED';
};

@Component({
  selector: 'app-timesheet-editor',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatCardModule, MatTableModule, MatIconModule, MatButtonModule, MatSnackBarModule,
    MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule,
    MatSelectModule, MatTooltipModule, MatChipsModule, MatDividerModule, MatProgressSpinnerModule
  ],
  templateUrl: './timesheet-editor.component.html',
  styleUrls: ['./timesheet-editor.component.scss']
})
export class TimesheetEditorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private tsSvc = inject(TimesheetsService);
  private projSvc = inject(ProjectsService);

  // selected date (stored as UTC date string)
  selectedDate = signal(this.toUtcDateString(new Date()));
  
  // computed date range for API calls (same day for from/to)
  from = computed(() => this.selectedDate());
  to = computed(() => this.selectedDate());

  projects = signal<Project[]>([]);
  rows = signal<TimesheetEntry[]>([]);
  loading = signal(false);
  displayed = ['date','project','hours','description','ticket','status','actions'];

  // forms
  form = this.fb.group({ items: this.fb.array<FormGroup>([]) });
  get items() { return this.form.get('items') as FormArray<FormGroup>; }

  // header add-row form
  newRow = this.fb.group({
    workDate: new FormControl<Date | null>(new Date(), { nonNullable: false }),
    projectId: ['', Validators.required],
    hours: [0, [Validators.min(0), Validators.max(24)]],
    description: [''],
    ticketRef: ['']
  });

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
    
    // Update the form's workDate when selectedDate changes
    this.updateNewRowDate();
    
    // Listen for date changes in the new entry form
    this.newRow.get('workDate')?.valueChanges.subscribe(newDate => {
      if (newDate) {
        const newDateStr = this.toUtcDateString(newDate);
        // Only update if it's different from current selected date
        if (newDateStr !== this.selectedDate()) {
          this.selectedDate.set(newDateStr);
          this.load(); // Refresh entries for the new date
        }
      }
    });
  }

  updateNewRowDate() {
    const selectedDateStr = this.selectedDate();
    // Convert UTC date string to local Date object for the date picker
    const localDate = this.utcDateStringToLocal(selectedDateStr);
    this.newRow.patchValue({ workDate: localDate }, { emitEvent: false });
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
        this.snack.open('Failed to load projects', 'OK', { duration: 3000 });
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
        this.snack.open('Failed to load timesheets. Please check your connection.', 'OK', { duration: 4000 });
      }
    });
  }

  buildRow(r: TimesheetEntry) {
    const g = this.fb.group({
      entryId: [r.entryId],
      workDate: [r.workDate, Validators.required],
      projectId: [r.projectId, Validators.required],
      hours: [r.hours, [Validators.required, Validators.min(0), Validators.max(24)]],
      description: [r.description ?? ''],
      ticketRef: [r.ticketRef ?? ''],
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
      this.snack.open('Select date and project', 'OK', { duration: 2000 });
      return;
    }
    if (hours < 0 || hours > 24) {
      this.snack.open('Hours must be between 0 and 24', 'OK', { duration: 2000 });
      return;
    }
    if (hours > 0 && !val.description?.trim()) {
      this.snack.open('Description required when hours > 0', 'OK', { duration: 2000 });
      return;
    }

    const dto = {
      projectId: val.projectId!,
      workDate: this.toUtcDateString(val.workDate as Date),
      hours,
      description: val.description?.trim() || undefined,
      ticketRef: val.ticketRef?.trim() || undefined
    };

    console.log('addRow: DTO to send:', dto); // Debug log

    this.tsSvc.create(dto).subscribe({
      next: (created: any) => {
        console.log('addRow: Created entry:', created); // Debug log
        this.snack.open('Draft entry created', 'OK', { duration: 1500 });
        this.newRow.reset({
          workDate: this.utcDateStringToLocal(this.selectedDate()),
          projectId: '',
          hours: 0,
          description: '',
          ticketRef: ''
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
        
        this.snack.open(errorMessage, 'OK', { duration: 4000 });
      }
    });
  }

  saveRow(ix: number) {
    const g = this.items.at(ix);
    if (!g) return;
    if (!this.isDraft(g.get('status')!.value)) {
      this.snack.open('Only DRAFT entries can be edited', 'OK', { duration: 2000 });
      return;
    }
    const hours = Number(g.get('hours')!.value);
    if (hours > 0 && !(g.get('description')!.value || '').trim()) {
      this.snack.open('Description required when hours > 0', 'OK', { duration: 2000 });
      return;
    }
    const id = g.get('entryId')!.value as string;
    const body = {
      hours,
      description: (g.get('description')!.value || '').trim(),
      ticketRef: (g.get('ticketRef')!.value || '').trim()
    };
    this.tsSvc.update(id, body).subscribe({
      next: (updated: any) => {
        g.patchValue({ dirty: false, hours: updated.hours, description: updated.description ?? '', ticketRef: updated.ticketRef ?? '' }, { emitEvent: false });
        
        // Update the rows signal to reflect the saved changes
        this.rows.update(rows => rows.map(row => 
          row.entryId === id 
            ? { ...row, hours: updated.hours, description: updated.description ?? '', ticketRef: updated.ticketRef ?? '' }
            : row
        ));
        
        this.snack.open('Saved', 'OK', { duration: 1200 });
      },
      error: err => this.snack.open(err?.error ?? 'Save failed', 'OK', { duration: 2500 })
    });
  }

  submitRow(ix: number) {
    const g = this.items.at(ix);
    if (!g) return;
    if (!this.isDraft(g.get('status')!.value)) {
      this.snack.open('Only DRAFT entries can be submitted', 'OK', { duration: 2000 });
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
        
        this.snack.open('Submitted for approval', 'OK', { duration: 1500 });
      },
      error: err => this.snack.open(err?.error ?? 'Submit failed', 'OK', { duration: 2500 })
    });
  }

  // (optional) delete a DRAFT row
  deleteRow(ix: number) {
    const g = this.items.at(ix);
    if (!g) return;
    if (!this.isDraft(g.get('status')!.value)) {
      this.snack.open('Only DRAFT entries can be deleted', 'OK', { duration: 2000 });
      return;
    }
    const id = g.get('entryId')!.value as string;
    if (!confirm('Delete this draft entry?')) return;
    this.tsSvc.delete(id).subscribe({
      next: () => {
        this.items.removeAt(ix);
        
        // Update the rows signal to remove the deleted entry
        this.rows.update(rows => rows.filter(row => row.entryId !== id));
        
        this.snack.open('Deleted', 'OK', { duration: 1200 });
      },
      error: err => this.snack.open(err?.error ?? 'Delete failed', 'OK', { duration: 2500 })
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
      'chip-draft': statusText === 'DRAFT',
      'chip-submitted': statusText === 'SUBMITTED',
      'chip-approved': statusText === 'APPROVED',
      'chip-locked': statusText === 'LOCKED',
      'chip-rejected': statusText === 'REJECTED'
    };
  }

  isDraft(status: any) {
    return this.statusLabel(status) === 'DRAFT';
  }
}
