import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { TimesheetsService } from '../../../core/services/timesheets.service';
import { ProjectsService } from '../../../core/services/projects.service';
import { TasksService, ProjectTask } from '../../../core/services/tasks.service';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService, AppUser } from '../../../core/services/users.service';
import { HolidayService, Holiday } from '../../../core/services/holiday.service';
import { LeaveService, LeaveRequest } from '../../../core/services/leave.service';
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
  private authSvc = inject(AuthService);
  private usersSvc = inject(UsersService);
  private holidaySvc = inject(HolidayService);
  private leaveSvc = inject(LeaveService);
  
  tasks = signal<ProjectTask[]>([]);
  private tasksByProject: Record<string, ProjectTask[]> = {};
  
  // Holidays and leaves for the selected date
  holidays = signal<Holiday[]>([]);
  approvedLeaves = signal<LeaveRequest[]>([]);
  currentDateHoliday = computed<Holiday | null>(() => {
    const selectedDate = this.selectedDate();
    return this.holidays().find(h => h.holidayDate === selectedDate) || null;
  });
  currentDateLeaves = computed<LeaveRequest[]>(() => {
    const selectedDate = this.selectedDate();
    const currentUser = this.authSvc.getCurrentUser();
    
    // For admin viewing specific user or all users
    const targetUserId = this.selectedUserId() || currentUser?.userId;
    
    return this.approvedLeaves().filter(leave => {
      // Check if the leave is for the target user (or show all if admin viewing all)
      const isTargetUser = !this.selectedUserId() || leave.employeeId === targetUserId;
      
      // Check if the selected date falls within the leave period
      // Extract just the date part (YYYY-MM-DD) from ISO format
      const leaveStartDate = leave.startDate.substring(0, 10);
      const leaveEndDate = leave.endDate.substring(0, 10);
      
      // For date comparison, need to handle if backend sends endDate as next day at 00:00:00
      // Create Date objects for proper comparison
      const selectedDateObj = new Date(selectedDate + 'T00:00:00');
      const startDateObj = new Date(leaveStartDate + 'T00:00:00');
      const endDateObj = new Date(leaveEndDate + 'T00:00:00');
      
      // If endDate time is 00:00:00, it likely means end of previous day
      // Check if original endDate has time component
      const hasTimeComponent = leave.endDate.includes('T');
      const endDateTime = hasTimeComponent ? leave.endDate.split('T')[1] : '';
      const isEndDateMidnight = endDateTime.startsWith('00:00:00');
      
      // Adjust end date if it's midnight (subtract 1 day)
      if (hasTimeComponent && isEndDateMidnight) {
        endDateObj.setDate(endDateObj.getDate() - 1);
      }
      
      return isTargetUser && 
             leave.status === 'Approved' && 
             selectedDateObj >= startDateObj && 
             selectedDateObj <= endDateObj;
    });
  });

  // Admin functionality
  isAdmin = signal<boolean>(false);
  users = signal<AppUser[]>([]);
  selectedUserId = signal<string | null>(null);
  selectedProjectId = signal<string | null>(null);
  viewMode = signal<'own' | 'user' | 'project' | 'all'>('own');

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
  submitting = signal(false); // Add submitting state to prevent duplicate submissions
  editingRowIndex = signal<number | null>(null); // Track which row is being edited
  displayed = ['date','project','hours','description','ticket','taskType','status','actions'];

  // Computed property for project dropdown options
  projectOptions = computed<DropdownOption[]>(() => {
    return this.projects().map(project => ({
      value: project.projectId,
      label: `${project.name} — ${project.client?.name || project.clientId}`,
      searchableText: `${project.name} ${project.client?.name || project.clientId}`.toLowerCase()
    }));
  });

  // Computed property for task dropdown options based on selected project
  taskOptions = computed<DropdownOption[]>(() => {
    const selectedProjectId = this.newRow.get('projectId')?.value;
    
    if (!selectedProjectId) {
      return [];
    }
    
    // Always use the tasks signal as the primary source for reactivity
    const tasks = this.tasks();
    
    const options = tasks.map(task => ({
      value: task.taskId,
      label: task.title,
      searchableText: task.title.toLowerCase()
    }));
    
    return options;
  });

  // Admin dropdown options
  userOptions = computed<DropdownOption[]>(() => {
    return this.users().map(user => ({
      value: user.userId,
      label: `${user.firstName} ${user.lastName} (${user.email})`,
      searchableText: `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase()
    }));
  });

  projectFilterOptions = computed<DropdownOption[]>(() => {
    return [
      { value: '', label: 'All Projects', searchableText: 'all projects' },
      ...this.projects().map(project => ({
        value: project.projectId,
        label: `${project.name} — ${project.client?.name || project.clientId}`,
        searchableText: `${project.name} ${project.client?.name || project.clientId}`.toLowerCase()
      }))
    ];
  });

  // Task types for dropdown
  taskTypes = getTaskTypes();
  getTaskTypeDisplayName = getTaskTypeDisplayName;

  // Custom validator to prevent future dates
  futureDateValidator = (control: AbstractControl) => {
    if (!control.value) return null;
    
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
      return { futureDate: { message: 'Cannot enter timesheets for future dates' } };
    }
    
    return null;
  };

  // forms
  form = this.fb.group({ items: this.fb.array<FormGroup>([]) });
  get items() { return this.form.get('items') as FormArray<FormGroup>; }

  // header add-row form
  newRow = this.fb.group({
    workDate: [new Date().toISOString().slice(0, 10), [Validators.required, this.futureDateValidator]],
    projectId: ['', Validators.required],
    taskId: [''],
    hours: [0, [Validators.min(0), Validators.max(24)]],
    description: [''],
    ticketRef: [''],
    taskType: ['', Validators.required] // Empty string as default, require user selection
  });

  onDateChange(event: any) {
    const newDateStr = event.target.value; // YYYY-MM-DD format
    if (newDateStr && newDateStr !== this.selectedDate()) {
      // Validate that the date is not in the future
      const selectedDate = new Date(newDateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate > today) {
        this.showNotification('Cannot select future dates for timesheets', 'error');
        // Reset to today's date
        const todayStr = new Date().toISOString().slice(0, 10);
        this.newRow.patchValue({ workDate: todayStr }, { emitEvent: false });
        return;
      }
      
      this.selectedDate.set(newDateStr);
      this.load(); // Refresh entries for the new date
      
      // Auto-create holiday/leave entry after a short delay to ensure data is loaded
      setTimeout(() => this.autoCreateHolidayOrLeaveEntry(), 100);
    }
  }

  // computed totals
  totalHours = computed(() => this.items.controls.reduce((sum, g) => sum + (+g.get('hours')!.value || 0), 0));
  
  // Daily total for the selected date (excluding holiday/leave entries for limit check)
  dailyTotal = computed(() => {
    const dateStr = this.selectedDate();
    
    // Calculate from the rows signal (actual data from backend) instead of form controls
    // This ensures we get the saved values, not the form values
    // Exclude holiday/leave entries from the total for daily limit checking
    return this.rows()
      .filter(row => 
        row.workDate === dateStr && 
        !row.description?.includes('Holiday') && 
        !row.description?.includes('Leave')
      )
      .reduce((sum, row) => sum + (row.hours || 0), 0);
  });

  // Check if the next day would be in the future
  isNextDayFuture = computed(() => {
    const selectedDateStr = this.selectedDate();
    const utcDate = this.utcDateStringToUtcDate(selectedDateStr);
    utcDate.setUTCDate(utcDate.getUTCDate() + 1);
    const nextDateStr = this.toUtcDateString(utcDate);
    const today = this.getTodayDateString();
    return nextDateStr > today;
  });

  ngOnInit(): void {
    // Check if user is admin
    this.isAdmin.set(this.authSvc.isAdmin());
    
    // Load admin data if needed
    if (this.isAdmin()) {
      this.loadUsers();
    }
    
    this.loadProjects();
    this.loadHolidays();
    this.loadApprovedLeaves();
    this.load();
    this.updateNewRowDate();
    this.newRow.get('workDate')?.valueChanges.subscribe(newDate => {
      if (newDate && typeof newDate === 'string' && newDate !== this.selectedDate()) {
        this.selectedDate.set(newDate);
        this.load();
        // Auto-create holiday/leave entry when date changes
        setTimeout(() => this.autoCreateHolidayOrLeaveEntry(), 100);
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
    
    // Auto-create entry for holiday or leave
    this.autoCreateHolidayOrLeaveEntry();
  }
  
  autoCreateHolidayOrLeaveEntry() {
    const holiday = this.currentDateHoliday();
    const leaves = this.currentDateLeaves();
    const selectedDate = this.selectedDate();
    
    // Check if there's already a holiday/leave entry for this date
    const existingEntry = this.rows().find(r => 
      r.workDate === selectedDate && 
      (r.description?.includes('Holiday') || r.description?.includes('Leave'))
    );
    
    // If there's already an entry, clear the form and don't create duplicate
    if (existingEntry) {
      this.newRow.patchValue({
        projectId: '',
        taskId: '',
        hours: 0,
        description: '',
        taskType: '',
        ticketRef: ''
      }, { emitEvent: false });
      return;
    }
    
    // Find "Internal" project for holidays/leaves, or use first available project as fallback
    let projectForLeave = this.projects().find(p => 
      p.code === 'INTERNAL' || p.name.toLowerCase().includes('internal')
    );
    
    // If Internal project not found, use the first available project
    if (!projectForLeave && this.projects().length > 0) {
      projectForLeave = this.projects()[0];
    }
    
    // Only proceed if we have a project
    if (!projectForLeave) {
      return;
    }
    
    let description = '';
    let shouldCreate = false;
    
    if (holiday) {
      description = `Holiday - ${holiday.name}`;
      shouldCreate = true;
    } else if (leaves.length > 0) {
      const leaveInfo = leaves.map(l => l.leaveType).join(', ');
      description = `Leave - ${leaveInfo}`;
      shouldCreate = true;
    }
    
    // Automatically create the entry if it's a holiday or leave
    if (shouldCreate) {
      const dto = {
        projectId: projectForLeave.projectId,
        workDate: selectedDate,
        hours: 9,
        description: description,
        ticketRef: undefined,
        taskType: 0 as TaskType, // Development
        taskId: undefined
      };
      
      this.tsSvc.create(dto).subscribe({
        next: (created: any) => {
          this.showNotification(`${holiday ? 'Holiday' : 'Leave'} entry created automatically`, 'OK', { duration: 2000 });
          // Reload to show the new entry
          this.load();
        },
        error: (err) => {
          console.error('Auto-create entry error:', err);
          // Silently fail - user can still add manually if needed
        }
      });
    } else {
      // Clear the form for normal working days
      this.newRow.patchValue({
        projectId: '',
        taskId: '',
        hours: 0,
        description: '',
        taskType: '',
        ticketRef: ''
      }, { emitEvent: false });
    }
  }

  loadProjects() {
    this.projSvc.getAll().subscribe({
      next: (ps: any[]) => {
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
    this.loading.set(true);
    
    // Determine which service method to call based on admin status and selections
    let timesheetObservable;
    
    if (this.isAdmin()) {
      const selectedUserId = this.selectedUserId();
      const selectedProjectId = this.selectedProjectId();
      
      if (selectedUserId) {
        // Load timesheets for specific user
        timesheetObservable = this.tsSvc.listForUser(selectedUserId, this.from(), this.to());
      } else if (selectedProjectId) {
        // Load timesheets for specific project (all users)
        timesheetObservable = this.tsSvc.listForProject(selectedProjectId, this.from(), this.to());
      } else {
        // Load all timesheets
        timesheetObservable = this.tsSvc.listAll(this.from(), this.to());
      }
    } else {
      // Regular user - load their own timesheets
      timesheetObservable = this.tsSvc.list(this.from(), this.to());
    }
    
    timesheetObservable.subscribe({
      next: (data: any[]) => {
        this.rows.set(data as TimesheetEntry[]);
        
        // rebuild form array
        this.items.clear();
        this.rows().forEach((r: TimesheetEntry) => this.items.push(this.buildRow(r)));
        
        // Load tasks for all projects in the timesheet entries
        this.loadTasksForCurrentProjects();
        
        this.loading.set(false);
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
    
    // Create cache key based on project and user context
    const currentUser = this.authSvc.getCurrentUser();
    const isUserSpecific = !this.isAdmin() && currentUser?.userId;
    const cacheKey = isUserSpecific ? `${projectId}_${currentUser.userId}` : projectId;
    
    // Check cache with appropriate key
    if (this.tasksByProject[cacheKey]) {
      // If we have cached data, use it
      if (projectId === this.newRow.get('projectId')?.value) {
        this.tasks.set(this.tasksByProject[cacheKey]);
      }
      return;
    }
    
    // For non-admin users, filter tasks by the current user's assignments
    const filterOptions: { assignedUserId?: string } = {};
    
    // Only filter by current user if not an admin
    if (isUserSpecific) {
      filterOptions.assignedUserId = currentUser.userId;
    }
    
    this.tasksSvc.list(projectId, filterOptions).subscribe({
      next: response => {
        // Cache with the appropriate key
        this.tasksByProject[cacheKey] = response.tasks;
        
        if (projectId === this.newRow.get('projectId')?.value) {
          this.tasks.set(response.tasks);
        }
      },
      error: error => {
        console.error('Error loading tasks:', error);
      }
    });
  }

  private loadUsers(): void {
    this.usersSvc.list().subscribe({
      next: (users) => {
        this.users.set(users);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.showNotification('Failed to load users', 'error');
      }
    });
  }

  private loadHolidays(): void {
    // Load holidays for current year
    const currentYear = new Date().getFullYear();
    const from = `${currentYear}-01-01`;
    const to = `${currentYear}-12-31`;
    
    this.holidaySvc.getHolidays(from, to).subscribe({
      next: (holidays) => {
        this.holidays.set(holidays);
      },
      error: (error) => {
        console.error('Error loading holidays:', error);
        // Don't show error to user, just fail silently as it's not critical
      }
    });
  }

  private loadApprovedLeaves(): void {
    const currentUser = this.authSvc.getCurrentUser();
    if (!currentUser) return;
    
    // For admin, load all approved leaves if viewing all employees
    // For regular users or admin viewing specific user, load that user's leaves
    let leaveObservable;
    
    if (this.isAdmin() && !this.selectedUserId()) {
      // Admin viewing all - load all approved leaves
      leaveObservable = this.leaveSvc.getAllLeaveRequests();
    } else if (this.isAdmin() && this.selectedUserId()) {
      // Admin viewing specific user
      leaveObservable = this.leaveSvc.getEmployeeLeaveRequests(this.selectedUserId()!);
    } else {
      // Regular user - load their own leaves
      leaveObservable = this.leaveSvc.getMyLeaveRequests();
    }
    
    leaveObservable.subscribe({
      next: (response: any) => {
        // Handle different response structures
        let leaves: LeaveRequest[] = [];
        
        if (Array.isArray(response)) {
          leaves = response;
        } else if (response && Array.isArray(response.data)) {
          leaves = response.data;
        } else if (response && Array.isArray(response.leaveRequests)) {
          leaves = response.leaveRequests;
        } else {
          console.warn('Unexpected leave response format:', response);
          leaves = [];
        }
        
        // Filter only approved leaves
        const approvedLeaves = leaves.filter(leave => leave.status === 'Approved');
        this.approvedLeaves.set(approvedLeaves);
      },
      error: (error) => {
        console.error('Error loading approved leaves:', error);
        // Don't show error to user, just fail silently as it's not critical
      }
    });
  }

  getTasksForProject(projectId: string | null | undefined): ProjectTask[] {
    if (!projectId) {
      return [];
    }
    
    // Use the same cache key logic as loadTasksForProject
    const currentUser = this.authSvc.getCurrentUser();
    const isUserSpecific = !this.isAdmin() && currentUser?.userId;
    const cacheKey = isUserSpecific ? `${projectId}_${currentUser.userId}` : projectId;
    
    const result = this.tasksByProject[cacheKey] || [];
    
    // If this is for the currently selected project, update the signal to trigger reactivity
    if (projectId === this.newRow.get('projectId')?.value && result.length > 0) {
      this.tasks.set(result);
    }
    
    return result;
  }

  // Get task options for a specific project (used in edit mode)
  getTaskOptionsForProject(projectId: string | null | undefined): DropdownOption[] {
    if (!projectId) return [];
    
    // Use the same cache key logic
    const currentUser = this.authSvc.getCurrentUser();
    const isUserSpecific = !this.isAdmin() && currentUser?.userId;
    const cacheKey = isUserSpecific ? `${projectId}_${currentUser.userId}` : projectId;
    
    // Ensure tasks are loaded for this project
    if (!this.tasksByProject[cacheKey]) {
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
      workDate: [r.workDate, [Validators.required, this.futureDateValidator]],
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
    if (this.submitting()) return; // Prevent multiple submissions
    
    const val = this.newRow.value;
    
    // Check if this is a holiday or leave entry (by description or by date)
    const isHolidayOrLeaveByDescription = val.description?.includes('Holiday') || val.description?.includes('Leave');
    const isHolidayOrLeaveByDate = this.currentDateHoliday() !== null || this.currentDateLeaves().length > 0;
    const isHolidayOrLeave = isHolidayOrLeaveByDescription || isHolidayOrLeaveByDate;
    
    // validations
    const hours = Number(val.hours ?? 0);
    if (!val.workDate) {
      this.showNotification('Select date', 'OK', { duration: 2000 });
      return;
    }
    
    // Only require project if it's NOT a holiday/leave entry
    if (!isHolidayOrLeave && !val.projectId) {
      this.showNotification('Select project', 'OK', { duration: 2000 });
      return;
    }
    
    // For holiday/leave, try to find and auto-select Internal project, but allow without it
    if (isHolidayOrLeave && !val.projectId) {
      const internalProject = this.projects().find(p => 
        p.code === 'INTERNAL' || p.name.toLowerCase().includes('internal')
      );
      if (internalProject) {
        this.newRow.patchValue({ projectId: internalProject.projectId }, { emitEvent: false });
        val.projectId = internalProject.projectId;
      }
      // If Internal project not found, we'll use the first available project as fallback
      if (!val.projectId && this.projects().length > 0) {
        const fallbackProject = this.projects()[0];
        this.newRow.patchValue({ projectId: fallbackProject.projectId }, { emitEvent: false });
        val.projectId = fallbackProject.projectId;
      }
    }
    
    if (hours < 0 || hours > 24) {
      console.log('Validation failed: Hours out of range');
      this.showNotification('Hours must be between 0 and 24', 'OK', { duration: 2000 });
      return;
    }
    if (hours > 0 && !val.description?.trim()) {
      console.log('Validation failed: Description required');
      this.showNotification('Description required when hours > 0', 'OK', { duration: 2000 });
      return;
    }
    if (val.taskType === null || val.taskType === undefined || val.taskType === '') {
      console.log('Validation failed: Task type required');
      this.showNotification('Please select a task type', 'OK', { duration: 2000 });
      return;
    }
    
    console.log('All validations passed, creating entry');

    this.submitting.set(true); // Set submitting state

    const dto = {
      projectId: val.projectId!,
      workDate: val.workDate as string, // Already in YYYY-MM-DD format
      hours,
      description: val.description?.trim() || undefined,
      ticketRef: val.ticketRef?.trim() || undefined,
      taskType: Number(val.taskType) as TaskType,
      taskId: val.taskId || undefined
    };

    this.tsSvc.create(dto).subscribe({
      next: (created: any) => {
        this.showNotification('Draft entry created', 'OK', { duration: 1500 });
        this.newRow.reset({
          workDate: this.selectedDate(), // Already in YYYY-MM-DD format
          projectId: '',
          taskId: '',
          hours: 0,
          description: '',
          ticketRef: '',
          taskType: ''
        });
        
        // Instead of manually adding to rows/items, reload the data to ensure consistency
        this.load();
      },
      error: (err) => {
        console.error('Create entry error:', err); // Keep for debugging
        
        // Handle specific error messages
        let errorMessage = 'Failed to create entry';
        
        // Check for specific daily cap error first
        if (err?.error?.includes && err.error.includes('Daily cap exceeded')) {
          errorMessage = 'Daily limit exceeded! You can only log up to 12 hours per day.';
        } else {
          // Use the same error extraction logic as submit
          if (err?.error) {
            if (typeof err.error === 'string') {
              errorMessage = err.error;
            } else if (typeof err.error === 'object' && err.error?.error) {
              errorMessage = err.error.error;
            } else if (typeof err.error === 'object' && err.error?.message) {
              errorMessage = err.error.message;
            } else if (typeof err.error === 'object') {
              const errorObj = err.error;
              if (errorObj.error || errorObj.message || errorObj.details) {
                errorMessage = errorObj.error || errorObj.message || errorObj.details;
              } else {
                errorMessage = Object.values(errorObj)[0] as string || 'Failed to create entry';
              }
            }
          } else if (err?.message) {
            errorMessage = err.message;
          }
        }
        
        this.showNotification(errorMessage, 'OK', { duration: 4000 });
      },
      complete: () => {
        this.submitting.set(false); // Reset submitting state
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
      error: (err) => {
        console.error('Update entry error:', err); // Keep for debugging
        
        // Extract error message using the same logic as other operations
        let errorMessage = 'Save failed';
        
        if (err?.error) {
          if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (typeof err.error === 'object' && err.error?.error) {
            errorMessage = err.error.error;
          } else if (typeof err.error === 'object' && err.error?.message) {
            errorMessage = err.error.message;
          } else if (typeof err.error === 'object') {
            const errorObj = err.error;
            if (errorObj.error || errorObj.message || errorObj.details) {
              errorMessage = errorObj.error || errorObj.message || errorObj.details;
            } else {
              errorMessage = Object.values(errorObj)[0] as string || 'Save failed';
            }
          }
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        this.showNotification(errorMessage, 'OK', { duration: 2500 });
      }
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
      error: (err) => {
        console.error('Submit error:', err); // Keep for debugging
        
        // Extract error message from various possible error structures
        let errorMessage = 'Submit failed';
        
        if (err?.error) {
          // Handle string error response
          if (typeof err.error === 'string') {
            errorMessage = err.error;
          }
          // Handle object error response with 'error' property (like {"error":"Cannot submit another user's timesheet."})
          else if (typeof err.error === 'object' && err.error?.error) {
            errorMessage = err.error.error;
          }
          // Handle object error response with 'message' property  
          else if (typeof err.error === 'object' && err.error?.message) {
            errorMessage = err.error.message;
          }
          // Handle plain object that might be a JSON response
          else if (typeof err.error === 'object') {
            // If it's a JSON object, try to extract meaningful message
            const errorObj = err.error;
            if (errorObj.error || errorObj.message || errorObj.details) {
              errorMessage = errorObj.error || errorObj.message || errorObj.details;
            } else {
              // Fallback: stringify the object but make it user-friendly
              errorMessage = Object.values(errorObj)[0] as string || 'Submit failed';
            }
          }
        } 
        // Handle error with direct message property
        else if (err?.message) {
          errorMessage = err.message;
        }
        
        this.showNotification(errorMessage, 'OK', { duration: 3000 });
      }
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
      error: (err) => {
        console.error('Delete entry error:', err); // Keep for debugging
        
        // Extract error message using the same logic as other operations
        let errorMessage = 'Delete failed';
        
        if (err?.error) {
          if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (typeof err.error === 'object' && err.error?.error) {
            errorMessage = err.error.error;
          } else if (typeof err.error === 'object' && err.error?.message) {
            errorMessage = err.error.message;
          } else if (typeof err.error === 'object') {
            const errorObj = err.error;
            if (errorObj.error || errorObj.message || errorObj.details) {
              errorMessage = errorObj.error || errorObj.message || errorObj.details;
            } else {
              errorMessage = Object.values(errorObj)[0] as string || 'Delete failed';
            }
          }
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        this.showNotification(errorMessage, 'OK', { duration: 2500 });
      }
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
    
    const nextDateStr = this.toUtcDateString(utcDate);
    const today = this.getTodayDateString();
    
    // Don't allow navigation to future dates
    if (nextDateStr > today) {
      this.showNotification('Cannot navigate to future dates', 'OK', { duration: 2000 });
      return;
    }
    
    this.selectedDate.set(nextDateStr); 
    this.updateNewRowDate();
    this.load(); 
  }

  // UTC Date handling methods
  
  /**
   * Gets today's date as a string in YYYY-MM-DD format for use in date input max attribute
   */
  getTodayDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }

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

  projectLabel(id: string, description?: string) {
    // For holiday/leave entries, show dash instead of project
    if (description && (description.includes('Holiday') || description.includes('Leave'))) {
      return '—';
    }
    const p = this.projects().find(x => x.projectId === id);
    return p ? `${p.name} — ${p.client?.name || p.clientId}` : id;
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
    
    // Use the same cache key logic
    const currentUser = this.authSvc.getCurrentUser();
    const isUserSpecific = !this.isAdmin() && currentUser?.userId;
    const cacheKey = isUserSpecific ? `${projectId}_${currentUser.userId}` : projectId;
    
    // If tasks aren't loaded for this project yet, try to load them
    if (!this.tasksByProject[cacheKey]) {
      this.loadTasksForProject(projectId);
      return 'Loading...';
    }
    
    const tasks = this.getTasksForProject(projectId);
    const task = tasks.find(t => t.taskId === taskId);
    return task ? task.title : 'Task not found';
  }

  // Admin-specific methods
  onUserSelectionChange(userId: string | null): void {
    this.selectedUserId.set(userId);
    this.selectedProjectId.set(null); // Clear project filter when user is selected
    this.loadApprovedLeaves(); // Reload leaves for the selected user
    this.load(); // Reload data with new filter
  }

  onProjectFilterChange(projectId: string | null): void {
    this.selectedProjectId.set(projectId);
    this.selectedUserId.set(null); // Clear user filter when project is selected
    this.load(); // Reload data with new filter
  }

  clearFilters(): void {
    this.selectedUserId.set(null);
    this.selectedProjectId.set(null);
    this.loadApprovedLeaves(); // Reload leaves for all users
    this.load(); // Reload all data
  }
}
