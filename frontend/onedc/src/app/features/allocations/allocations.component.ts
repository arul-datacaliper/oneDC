import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { AllocationService, WeeklyAllocation, CreateAllocationRequest, UpdateAllocationRequest, AllocationSummary, EmployeeAllocationSummary, WeeklyCapacity } from '../../core/services/allocation.service';
import { ProjectsService } from '../../core/services/projects.service';
import { UserManagementService, AppUser } from '../../core/services/user-management.service';
import { TimesheetsService } from '../../core/services/timesheets.service';
import { AuthService } from '../../core/services/auth.service';
import { Project } from '../../shared/models';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/components/confirmation-dialog.component';

// Interface for multiple employee allocation
export interface EmployeeAllocation {
  userId: string;
  userName: string;
  allocatedHours: number;
  periodHours?: number[]; // Hours for each month period when splitting by months
  existingAllocationStartDate?: string; // Start date of existing allocation
  existingAllocationEndDate?: string; // End date of existing allocation
  existingAllocationId?: string; // ID of existing allocation for tracking deletions
}

// Interface for month period allocation
export interface MonthPeriodAllocation {
  startDate: string;
  endDate: string;
  month: string;
  days: number;
  allocatedHours: number;
}

@Component({
  selector: 'app-allocations',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule, ConfirmationDialogComponent],
  templateUrl: './allocations.component.html',
  styleUrl: './allocations.component.scss'
})
export class AllocationsComponent implements OnInit {
  private allocationService = inject(AllocationService);
  private projectService = inject(ProjectsService);
  private userService = inject(UserManagementService);
  private timesheetService = inject(TimesheetsService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  private fb = inject(FormBuilder);

  // Expose Math for template use
  Math = Math;

  // Signals for reactive state management
  currentWeekStart = signal<string>('');
  viewMode = signal<'overview' | 'project' | 'employee'>('overview');
  selectedProjectId = signal<string>('');
  selectedUserId = signal<string>('');
  formWeekStartDate = signal<string>(''); // Track form week start date
  
  // Data signals
  allocations = signal<WeeklyAllocation[]>([]);
  projectSummary = signal<AllocationSummary[]>([]);
  employeeSummary = signal<EmployeeAllocationSummary[]>([]);
  availableProjects = signal<{projectId: string, projectName: string, clientName: string, status: string}[]>([]);
  availableEmployees = signal<{userId: string, userName: string, role: string}[]>([]);
  projectMembers = signal<{userId: string, userName: string, role: string, projectRole: string}[]>([]);
  
  // Pagination signals for infinite scroll
  displayedProjectCount = signal(8); // Initially show 8 projects to ensure scrollable content
  displayedEmployeeCount = signal(8); // Initially show 8 employees to ensure scrollable content
  
  // Computed properties
  availableProjectsWithDisplayName = computed(() => {
    return this.availableProjects().map(project => ({
      ...project,
      displayName: `${project.projectName} - ${project.clientName}`
    }));
  });
  
  // Filtered project summary with pagination
  filteredProjectSummary = computed(() => {
    const projects = this.projectSummary();
    return projects.slice(0, this.displayedProjectCount());
  });
  
  // Filtered employee summary with pagination
  filteredEmployeeSummary = computed(() => {
    const employees = this.employeeSummary();
    return employees.slice(0, this.displayedEmployeeCount());
  });
  
  // UI state signals
  isLoading = signal(false);
  showCreateModal = signal(false);
  showExportModal = signal(false);
  showDeleteModal = signal(false);
  deleteDialogData = signal<ConfirmationDialogData | null>(null);
  showUpdateConfirmModal = signal(false);
  updateConfirmDialogData = signal<ConfirmationDialogData | null>(null);
  pendingUpdateRequests = signal<{ allocationId: string; request: UpdateAllocationRequest; userName: string }[]>([]);
  pendingCreateRequests = signal<CreateAllocationRequest[]>([]);
  pendingDeleteRequests = signal<{ allocationId: string; userName: string }[]>([]);
  
  // Track initial employees with existing allocations when form is loaded
  initialEmployeesWithAllocations = signal<EmployeeAllocation[]>([]);
  editingAllocation = signal<WeeklyAllocation | null>(null);
  selectedEmployeeAllocations = signal<EmployeeAllocation[]>([]);
  availableEmployeesForSelection = signal<{userId: string, userName: string, role: string}[]>([]);
  selectedEmployeeForDropdown = signal<string | null>(null);
  
  // Multi-month allocation signals
  isMultiMonthWeek = signal<boolean>(false);
  monthPeriods = signal<MonthPeriodAllocation[]>([]);
  
  // Weekly capacity signals
  weeklyCapacities = signal<Map<string, any>>(new Map());
  
  // Export functionality
  exportFromDate = signal<string>('');
  exportToDate = signal<string>('');
  isExporting = signal<boolean>(false);
  selectedExportPeriod = signal<'prev-month' | 'this-month' | 'this-quarter' | 'custom'>('this-month');
  
  // Utilized hours tracking
  utilizedHoursCache = signal<Map<string, number>>(new Map());

  // Form
  allocationForm: FormGroup;

  // Computed properties
  filteredAllocations = computed(() => {
    const allocations = this.allocations();
    const viewMode = this.viewMode();
    const selectedProjectId = this.selectedProjectId();
    const selectedUserId = this.selectedUserId();
    
    if (viewMode === 'project' && selectedProjectId) {
      return allocations.filter(a => a.projectId === selectedProjectId);
    }
    if (viewMode === 'employee' && selectedUserId) {
      return allocations.filter(a => a.userId === selectedUserId);
    }
    return allocations;
  });

  // Helper to group allocations by employee and project (for month-split allocations)
  groupedAllocations = computed(() => {
    const allocations = this.filteredAllocations();
    const grouped = new Map<string, WeeklyAllocation[]>();
    
    allocations.forEach(allocation => {
      const key = `${allocation.projectId}-${allocation.userId}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(allocation);
    });
    
    return Array.from(grouped.entries()).map(([key, allocations]) => {
      const [projectId, userId] = key.split('-');
      const totalHours = allocations.reduce((sum, a) => sum + a.allocatedHours, 0);
      const avgUtilization = allocations.reduce((sum, a) => sum + a.utilizationPercentage, 0) / allocations.length;
      
      return {
        projectId,
        userId,
        projectName: allocations[0].projectName,
        userName: allocations[0].userName,
        totalAllocatedHours: totalHours,
        avgUtilizationPercentage: Math.round(avgUtilization * 100) / 100,
        allocations: allocations.sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate)),
        status: allocations[0].status,
        isMonthSplit: allocations.length > 1 // Flag to indicate if this is split across months
      };
    });
  });

  // Template helper methods
  weekEndDate(): string {
    if (this.currentWeekStart()) {
      return this.allocationService.getWeekEndDate(this.currentWeekStart());
    }
    return '';
  }

  // Format current week start for date input
  formatCurrentWeekStart(): string {
    const weekStart = this.currentWeekStart();
    if (weekStart) {
      return weekStart; // weekStart is already in YYYY-MM-DD format
    }
    return '';
  }

  // Format current week end for display
  formatCurrentWeekEnd(): string {
    const weekStart = this.currentWeekStart();
    if (weekStart) {
      return this.allocationService.getWeekEndDate(weekStart);
    }
    return '';
  }  constructor() {
    // Form validation for multiple employee allocation
    this.allocationForm = this.fb.group({
      projectId: ['', Validators.required],
      weekStartDate: ['', Validators.required],
      weekEndDate: ['', Validators.required]
    });

    // Track form weekStartDate changes and update signal
    this.allocationForm.get('weekStartDate')?.valueChanges.subscribe(value => {
      this.formWeekStartDate.set(value || '');
      // Auto-calculate end date when start date changes
      if (value) {
        const endDate = this.calculateWeekEndDate(value);
        this.allocationForm.get('weekEndDate')?.setValue(endDate, { emitEvent: false });
      }
    });

    // Track project selection changes and load project members
    this.allocationForm.get('projectId')?.valueChanges.subscribe(projectId => {
      if (projectId && !this.editingAllocation()) {
        this.loadProjectMembers(projectId);
      }
    });

    // Initialize with current week
    const today = new Date();
    this.currentWeekStart.set(this.allocationService.getWeekStartDate(today));
    
    // Initialize export dates with current month
    this.setCurrentMonth();
  }

  // Helper method to calculate week end date (Saturday) from start date (Sunday)
  private calculateWeekEndDate(weekStartDate: string): string {
    if (!weekStartDate) return '';
    
    const [year, month, day] = weekStartDate.split('-').map(Number);
    const startDate = new Date(year, month - 1, day); // month is 0-indexed in JS
    
    // Add 6 days for Saturday
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    // Format as YYYY-MM-DD
    const endYear = endDate.getFullYear();
    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
    const endDay = String(endDate.getDate()).padStart(2, '0');
    return `${endYear}-${endMonth}-${endDay}`;
  }

  ngOnInit() {
    this.loadInitialData();
  }

  private async loadInitialData() {
    this.isLoading.set(true);
    try {
      await Promise.all([
        this.loadAllocations(),
        this.loadProjectSummary(),
        this.loadEmployeeSummary(),
        this.loadAvailableProjects(),
        this.loadAvailableEmployees()
      ]);
    } catch (error) {
      this.toastr.error('Error loading allocation data');
      console.error('Error loading initial data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private loadAllocations() {
    return this.allocationService.getAllocationsForWeek(this.currentWeekStart()).subscribe({
      next: (allocations) => this.allocations.set(allocations),
      error: (error) => {
        console.error('Error loading allocations:', error);
        if (error.status === 401) {
          this.toastr.error('Please log in to view allocations');
        } else {
          this.toastr.error('Error loading allocations');
        }
      }
    });
  }

  private loadProjectSummary() {
    return this.allocationService.getProjectAllocationSummary(this.currentWeekStart()).subscribe({
      next: (summary) => this.projectSummary.set(summary),
      error: (error) => {
        console.error('Error loading project summary:', error);
        if (error.status === 401) {
          this.toastr.error('Please log in to view project summaries');
        }
      }
    });
  }

  private loadEmployeeSummary() {
    return this.allocationService.getEmployeeAllocationSummary(this.currentWeekStart()).subscribe({
      next: (summary) => this.employeeSummary.set(summary),
      error: (error) => {
        console.error('Error loading employee summary:', error);
        if (error.status === 401) {
          this.toastr.error('Please log in to view employee summaries');
        }
      }
    });
  }

  private loadAvailableProjects() {
    return this.allocationService.getAvailableProjects().subscribe({
      next: (projects) => this.availableProjects.set(projects),
      error: (error) => console.error('Error loading projects:', error)
    });
  }

  private loadAvailableEmployees() {
    return this.allocationService.getAvailableEmployees().subscribe({
      next: (employees) => {
        this.availableEmployees.set(employees);
        this.updateAvailableEmployeesForSelection();
      },
      error: (error) => console.error('Error loading employees:', error)
    });
  }

  private loadProjectMembers(projectId: string) {
    if (!projectId) {
      this.projectMembers.set([]);
      return;
    }

    this.projectService.getByIdWithMembers(projectId).subscribe({
      next: (projectDetails) => {
        const members = (projectDetails.projectMembers || []).map(member => ({
          userId: member.userId,
          userName: `${member.firstName} ${member.lastName}`,
          role: member.role,
          projectRole: member.projectRole
        }));
        this.projectMembers.set(members);
        
        // Auto-load all employees with allocations for this project
        this.loadAllProjectEmployees(members);
      },
      error: (error) => {
        console.error('Error loading project members:', error);
        console.error('Error details:', error.error);
        console.error('Error status:', error.status);
        this.projectMembers.set([]);
        this.toastr.error(`Failed to load project members: ${error.error?.message || error.message || 'Unknown error'}`);
      }
    });
  }

  private loadAllProjectEmployees(members: {userId: string, userName: string, role: string, projectRole: string}[]) {
    // Get the selected project ID and week dates from the form
    const projectId = this.allocationForm.get('projectId')?.value;
    const weekStartDate = this.allocationForm.get('weekStartDate')?.value;
    const weekEndDate = this.allocationForm.get('weekEndDate')?.value;

    // Normalize dates to YYYY-MM-DD format for comparison
    const normalizeDate = (dateStr: string): string => {
      if (!dateStr) return '';
      // Handle both YYYY-MM-DD and ISO date formats
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const normalizedWeekStart = normalizeDate(weekStartDate);
    const normalizedWeekEnd = normalizeDate(weekEndDate);

    // Get all existing allocations for this project that overlap with the selected week period
    const existingAllocations = this.allocations().filter(a => {
      const normalizedAllocStart = normalizeDate(a.weekStartDate);
      const normalizedAllocEnd = normalizeDate(a.weekEndDate);
      
      // Check if the allocation overlaps with the selected week
      // Overlap occurs if: allocation_start <= week_end AND allocation_end >= week_start
      const overlaps = a.projectId === projectId &&
        normalizedAllocStart <= normalizedWeekEnd &&
        normalizedAllocEnd >= normalizedWeekStart;
      
      return overlaps;
    });

    // Create a map of existing allocations by userId for quick lookup
    const existingAllocationMap = new Map<string, WeeklyAllocation>();
    existingAllocations.forEach(alloc => {
      existingAllocationMap.set(alloc.userId, alloc);
    });

    // Get all unique user IDs from both project members and existing allocations
    const allUserIds = new Set<string>([
      ...members.map(m => m.userId),
      ...existingAllocations.map(a => a.userId)
    ]);

    // Fetch weekly capacity for all users
    if (weekStartDate && weekEndDate && allUserIds.size > 0) {
      const userIdsArray = Array.from(allUserIds);
      // console.log('🔄 Loading weekly capacity for project members');
      // console.log('  - userIds:', userIdsArray);
      // console.log('  - dateRange:', weekStartDate, 'to', weekEndDate);
      
      this.allocationService.getWeeklyCapacity(weekStartDate, weekEndDate, userIdsArray).subscribe({
        next: (capacities) => {
         // console.log('✅ Received weekly capacity data for project members:', capacities);
          const capacityMap = new Map();
          capacities.forEach(cap => {
            //console.log(`  - Setting capacity for ${cap.userName} (${cap.userId}):`, cap);
            capacityMap.set(cap.userId, cap);
          });
          this.weeklyCapacities.set(capacityMap);
         // console.log('💾 Updated weeklyCapacities signal with project members data');
        },
        error: (error) => {
          console.error('❌ Error fetching weekly capacity for project members:', error);
        }
      });
    }

    // For employees, only add themselves to the allocation list
    if (this.isEmployee()) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        const currentMember = members.find(m => m.userId === currentUser.userId);
        if (currentMember) {
          // Check if there's an existing allocation for this user in the selected period
          const existingAllocation = existingAllocations.find(a => a.userId === currentUser.userId);

          const allocation: EmployeeAllocation = {
            userId: currentMember.userId,
            userName: currentMember.userName,
            allocatedHours: existingAllocation ? existingAllocation.allocatedHours : 0,
            existingAllocationStartDate: existingAllocation?.weekStartDate,
            existingAllocationEndDate: existingAllocation?.weekEndDate,
            existingAllocationId: existingAllocation?.allocationId
          };

          // Initialize periodHours if multi-month week is detected
          if (this.isMultiMonthWeek() && this.monthPeriods().length > 0) {
            allocation.periodHours = new Array(this.monthPeriods().length).fill(0);
          }

          this.selectedEmployeeAllocations.set([allocation]);
          this.updateAvailableEmployeesForSelection();
          
          if (existingAllocation) {
            this.toastr.info(`Existing allocation found: ${existingAllocation.allocatedHours} hours. You can update the hours below.`);
          } else {
            this.toastr.info('You have been auto-selected for allocation. Please enter your allocation hours.');
          }
        } else {
          // Employee is not a team member - check if they have allocations for the selected period
          const existingAllocation = existingAllocations.find(a => a.userId === currentUser.userId);

          this.selectedEmployeeAllocations.set([{
            userId: currentUser.userId,
            userName: currentUser.name,
            allocatedHours: existingAllocation ? existingAllocation.allocatedHours : 0,
            existingAllocationStartDate: existingAllocation?.weekStartDate,
            existingAllocationEndDate: existingAllocation?.weekEndDate
          }]);
          this.updateAvailableEmployeesForSelection();
          
          if (existingAllocation) {
            this.toastr.info(`Existing allocation found: ${existingAllocation.allocatedHours} hours. You can update the hours below.`);
          }
        }
      }
      return;
    }
    
    // For approvers and admins, load ALL employees who have allocations for this project
    // Clear existing allocations first
    this.selectedEmployeeAllocations.set([]);
    
    // Create a map to track all unique users (project members + all employees with allocations)
    const userMap = new Map<string, EmployeeAllocation>();
    
    // First, add all project members with their existing allocation hours for the selected period
    members.forEach(member => {
      // Find the most relevant existing allocation for this member in the selected period
      const existingAllocation = existingAllocations.find(a => a.userId === member.userId);
      
      const allocation: EmployeeAllocation = {
        userId: member.userId,
        userName: member.userName,
        allocatedHours: existingAllocation ? existingAllocation.allocatedHours : 0,
        existingAllocationStartDate: existingAllocation?.weekStartDate,
        existingAllocationEndDate: existingAllocation?.weekEndDate,
        existingAllocationId: existingAllocation?.allocationId
      };

      // Initialize periodHours if multi-month week is detected
      if (this.isMultiMonthWeek() && this.monthPeriods().length > 0) {
        allocation.periodHours = new Array(this.monthPeriods().length).fill(0);
      }

      userMap.set(member.userId, allocation);
    });
    
    // Then, add employees who have allocations but are NOT project members
    existingAllocations.forEach(existingAlloc => {
      if (!userMap.has(existingAlloc.userId)) {
        const allocation: EmployeeAllocation = {
          userId: existingAlloc.userId,
          userName: existingAlloc.userName,
          allocatedHours: existingAlloc.allocatedHours,
          existingAllocationStartDate: existingAlloc.weekStartDate,
          existingAllocationEndDate: existingAlloc.weekEndDate,
          existingAllocationId: existingAlloc.allocationId
        };

        // Initialize periodHours if multi-month week is detected
        if (this.isMultiMonthWeek() && this.monthPeriods().length > 0) {
          allocation.periodHours = new Array(this.monthPeriods().length).fill(0);
        }

        userMap.set(existingAlloc.userId, allocation);
      }
    });

    // Convert map to array
    const allocations = Array.from(userMap.values());
    
    this.selectedEmployeeAllocations.set(allocations);
    
    // Store initial employees for tracking deletions
    this.initialEmployeesWithAllocations.set([...allocations]);
    
    this.updateAvailableEmployeesForSelection();
    
    // Calculate counts more accurately for the selected period
    const projectMemberCount = members.length;
    const totalEmployeesWithAllocations = allocations.length;
    const employeesWithExistingHours = allocations.filter(a => a.allocatedHours > 0).length;
    const projectMemberIds = new Set(members.map(m => m.userId));
    const nonProjectMembersWithAllocations = allocations.filter(a => !projectMemberIds.has(a.userId)).length;
    
    // Improved messaging logic for selected period
    if (employeesWithExistingHours > 0) {
      let message = '';
      
      if (projectMemberCount > 0 && nonProjectMembersWithAllocations > 0) {
        message = `Loaded ${totalEmployeesWithAllocations} employee(s) for the selected period: ${projectMemberCount} team member(s) and ${nonProjectMembersWithAllocations} additional member(s).`;
      } else if (projectMemberCount > 0 && nonProjectMembersWithAllocations === 0) {
        message = `Loaded ${projectMemberCount} project team member(s) for the selected period.`;
      } else if (nonProjectMembersWithAllocations > 0) {
        message = `Loaded ${nonProjectMembersWithAllocations} employee(s) with allocations for the selected period.`;
      }
      
      if (employeesWithExistingHours > 0) {
        message += ` ${employeesWithExistingHours} employee(s) have existing allocations that overlap with this period - updating will modify their existing allocation.`;
      }
      
      this.toastr.info(message);
    } else if (allocations.length > 0) {
      if (projectMemberCount > 0) {
        this.toastr.info(`Auto-added ${projectMemberCount} project team member(s) for the selected period. Please enter allocation hours for each member.`);
      } else {
        this.toastr.info(`Found ${totalEmployeesWithAllocations} employee(s) for the selected period. Please enter allocation hours.`);
      }
    } else {
      this.toastr.info('No allocations found for the selected period. Please manually add team members for allocation.');
    }
  }

  resetToProjectDefaults() {
    const projectMembers = this.projectMembers();
    if (projectMembers.length > 0) {
      this.loadAllProjectEmployees(projectMembers);
      this.toastr.success('Reset to project team defaults successfully');
    }
  }

  onWeekChange(direction: 'prev' | 'next') {
    const currentDate = new Date(this.currentWeekStart());
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 7);
    } else {
      currentDate.setDate(currentDate.getDate() + 7);
    }
    this.currentWeekStart.set(this.allocationService.getWeekStartDate(currentDate));
    
    // Clear utilized hours cache for new week
    this.utilizedHoursCache.set(new Map());
    
    this.loadInitialData();
    
    // Reload utilized hours if an employee is selected
    const selectedUserId = this.selectedUserId();
    if (selectedUserId) {
      this.loadUtilizedHours(selectedUserId);
    }
  }

  onWeekDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const selectedDate = new Date(input.value + 'T00:00:00'); // Add time to avoid timezone issues
    if (!isNaN(selectedDate.getTime())) {
      this.currentWeekStart.set(this.allocationService.getWeekStartDate(selectedDate));
      
      // Clear utilized hours cache for new week
      this.utilizedHoursCache.set(new Map());
      
      this.loadInitialData();
      
      // Reload utilized hours if an employee is selected
      const selectedUserId = this.selectedUserId();
      if (selectedUserId) {
        this.loadUtilizedHours(selectedUserId);
      }
    }
  }

  onViewModeChange(mode: 'overview' | 'project' | 'employee') {
    this.viewMode.set(mode);
    this.selectedProjectId.set('');
    this.selectedUserId.set('');
    // Reset pagination when changing view mode
    this.displayedProjectCount.set(8);
    this.displayedEmployeeCount.set(8);
  }

  // Infinite scroll handlers
  onProjectSummaryScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Check if scrolled near bottom (within 50px)
    if (scrollHeight - scrollTop - clientHeight < 50) {
      this.loadMoreProjects();
    }
  }

  onEmployeeSummaryScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Check if scrolled near bottom (within 50px)
    if (scrollHeight - scrollTop - clientHeight < 50) {
      this.loadMoreEmployees();
    }
  }

  loadMoreProjects(): void {
    const currentCount = this.displayedProjectCount();
    const totalCount = this.projectSummary().length;
    
    // Load 10 more projects if not all are displayed
    if (currentCount < totalCount) {
      this.displayedProjectCount.set(Math.min(currentCount + 10, totalCount));
    }
  }

  loadMoreEmployees(): void {
    const currentCount = this.displayedEmployeeCount();
    const totalCount = this.employeeSummary().length;
    
    // Load 10 more employees if not all are displayed
    if (currentCount < totalCount) {
      this.displayedEmployeeCount.set(Math.min(currentCount + 10, totalCount));
    }
  }

  hasMoreProjectsToLoad(): boolean {
    return this.displayedProjectCount() < this.projectSummary().length;
  }

  hasMoreEmployeesToLoad(): boolean {
    return this.displayedEmployeeCount() < this.employeeSummary().length;
  }

  onProjectSelect(projectId: string) {
    this.selectedProjectId.set(projectId);
    this.viewMode.set('project');
  }

  onEmployeeSelect(userId: string) {
    this.selectedUserId.set(userId);
    this.viewMode.set('employee');
    
    // Load utilized hours for the selected employee
    if (userId) {
      this.loadUtilizedHours(userId);
      // Also ensure weekly capacity is loaded for this user
      this.loadWeeklyCapacityForUser(userId);
    }
  }

  // Load weekly capacity for a specific user
  private loadWeeklyCapacityForUser(userId: string) {
    const currentWeekStart = this.currentWeekStart();
    const currentWeekEnd = this.allocationService.getWeekEndDate(currentWeekStart);
    
    if (!currentWeekStart || !currentWeekEnd) return;
    
    // Check if capacity is already loaded for this user
    const existingCapacity = this.weeklyCapacities().get(userId);
    if (existingCapacity) {
      console.log('✅ Weekly capacity already loaded for user:', userId, existingCapacity);
      return;
    }
    
    console.log('🔄 Loading weekly capacity for selected user:', userId);
    
    this.allocationService.getWeeklyCapacity(currentWeekStart, currentWeekEnd, [userId]).subscribe({
      next: (capacities) => {
        console.log('✅ Received capacity data for user:', capacities);
        
        if (capacities.length > 0) {
          const capacity = capacities[0];
          console.log(`📊 Capacity for ${capacity.userName}:`, {
            workingDays: capacity.workingDays,
            holidayDays: capacity.holidayDays,
            leaveDays: capacity.leaveDays,
            actualWorkingDays: capacity.actualWorkingDays,
            capacityHours: capacity.capacityHours,
            availableHours: capacity.availableHours
          });
          
          // Update the capacity map
          const newCapacityMap = new Map(this.weeklyCapacities());
          newCapacityMap.set(userId, capacity);
          this.weeklyCapacities.set(newCapacityMap);
        }
      },
      error: (error) => {
        console.error('❌ Error loading weekly capacity for user:', error);
      }
    });
  }

  // Method to load utilized hours for a specific user
  private loadUtilizedHours(userId: string) {
    const currentWeekStart = this.currentWeekStart();
    if (!currentWeekStart) return;
    
    const cacheKey = `${userId}-${currentWeekStart}`;
    
    // Calculate week end date for API call
    const weekEndDate = this.allocationService.getWeekEndDate(currentWeekStart);
    
    // Fetch actual timesheet data
    this.timesheetService.listForUser(userId, currentWeekStart, weekEndDate).subscribe({
      next: (timesheets) => {
        const totalHours = timesheets.reduce((sum, entry) => sum + entry.hours, 0);
        
        // Update cache
        const newCache = new Map(this.utilizedHoursCache());
        newCache.set(cacheKey, totalHours);
        this.utilizedHoursCache.set(newCache);
      },
      error: (error) => {
        console.error('Error fetching timesheet data:', error);
        // Set 0 in cache to avoid repeated failed calls
        const newCache = new Map(this.utilizedHoursCache());
        newCache.set(cacheKey, 0);
        this.utilizedHoursCache.set(newCache);
      }
    });
  }

  openCreateModal() {
    if (!this.canCreateOrEdit()) {
      this.toastr.error('You do not have permission to create allocations');
      return;
    }
    
    this.allocationForm.reset();
    const currentWeek = this.currentWeekStart();
    const currentWeekEnd = this.calculateWeekEndDate(currentWeek);
    this.allocationForm.patchValue({
      weekStartDate: currentWeek,
      weekEndDate: currentWeekEnd
    });
    this.formWeekStartDate.set(currentWeek); // Update signal manually for initial value
    this.selectedEmployeeAllocations.set([]);
    this.projectMembers.set([]); // Clear project members
    this.selectedEmployeeForDropdown.set(null);
    this.weeklyCapacities.set(new Map()); // Clear capacity data
    
    // For employees, automatically select themselves
    if (this.isEmployee()) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        const currentEmployee = this.availableEmployees().find(emp => emp.userId === currentUser.userId);
        if (currentEmployee) {
          this.selectedEmployeeAllocations.set([{
            userId: currentEmployee.userId,
            userName: currentEmployee.userName,
            allocatedHours: 0
          }]);
          // Load capacity for the employee
          this.loadCapacityForSelectedEmployees();
        }
      }
    }
    
    this.updateAvailableEmployeesForSelection();
    this.editingAllocation.set(null);
    this.showCreateModal.set(true);
  }

  openEditModal(allocation: WeeklyAllocation) {
    if (!this.canCreateOrEdit()) {
      this.toastr.error('You do not have permission to edit allocations');
      return;
    }
    
    // Clear previous state first
    this.selectedEmployeeAllocations.set([]);
    this.projectMembers.set([]);
    this.weeklyCapacities.set(new Map());
    
    // Set the allocation being edited FIRST
    this.editingAllocation.set(allocation);
    
    // Set form values
    this.allocationForm.patchValue({
      projectId: allocation.projectId,
      weekStartDate: allocation.weekStartDate,
      weekEndDate: allocation.weekEndDate
    });
    this.formWeekStartDate.set(allocation.weekStartDate);
    
    // Set the specific employee allocation for this edit
    this.selectedEmployeeAllocations.set([{
      userId: allocation.userId,
      userName: allocation.userName,
      allocatedHours: allocation.allocatedHours,
      existingAllocationStartDate: allocation.weekStartDate,
      existingAllocationEndDate: allocation.weekEndDate
    }]);
    
    this.updateAvailableEmployeesForSelection();
    
    // Fetch weekly capacity for the employee being edited
    this.allocationService.getWeeklyCapacity(allocation.weekStartDate, allocation.weekEndDate, [allocation.userId]).subscribe({
      next: (capacities) => {
        const capacityMap = new Map();
        capacities.forEach(cap => {
          capacityMap.set(cap.userId, cap);
        });
        this.weeklyCapacities.set(capacityMap);
      },
      error: (error) => {
        console.error('Error fetching weekly capacity:', error);
      }
    });
    
    // Open modal last
    this.showCreateModal.set(true);
  }

  closeModal() {
    this.showCreateModal.set(false);
    this.editingAllocation.set(null);
    this.selectedEmployeeAllocations.set([]);
    this.initialEmployeesWithAllocations.set([]);
    this.pendingDeleteRequests.set([]);
    this.projectMembers.set([]); // Clear project members
    this.formWeekStartDate.set(''); // Clear the signal
    this.allocationForm.reset();
  }

  openExportModal() {
    this.showExportModal.set(true);
  }

  closeExportModal() {
    this.showExportModal.set(false);
  }

  exportToCsvAndClose() {
    this.exportToCsv();
    // Close modal after a short delay to allow export to complete
    setTimeout(() => {
      this.closeExportModal();
    }, 1000);
  }

  // Update available employees for selection (exclude already selected ones)
  updateAvailableEmployeesForSelection() {
    const allEmployees = this.availableEmployees();
    const selectedIds = this.selectedEmployeeAllocations().map(emp => emp.userId);
    const availableEmployees = allEmployees.filter(emp => !selectedIds.includes(emp.userId));
    this.availableEmployeesForSelection.set(availableEmployees);
  }

  // Add employee to allocation list
  addEmployeeAllocation(userId: string) {
    const employee = this.availableEmployees().find(emp => emp.userId === userId);
    if (employee) {
      const newEmployeeAllocation: EmployeeAllocation = {
        userId: employee.userId,
        userName: employee.userName,
        allocatedHours: 0 // No default hours - user must enter value
      };

      // Initialize periodHours if multi-month week is detected
      if (this.isMultiMonthWeek() && this.monthPeriods().length > 0) {
        newEmployeeAllocation.periodHours = new Array(this.monthPeriods().length).fill(0);
      }

      this.selectedEmployeeAllocations.update(current => [...current, newEmployeeAllocation]);
      this.updateAvailableEmployeesForSelection();
      
      // Load capacity for all selected employees (including the newly added one)
      this.loadCapacityForSelectedEmployees();
    }
  }

  // Handle employee selection from dropdown
  onEmployeeAdd(userId: string) {
    if (userId && userId !== '') {
      this.addEmployeeAllocation(userId);
      // Clear the dropdown selection immediately
      this.selectedEmployeeForDropdown.set(null);
    }
  }

  // Remove employee from allocation list
  removeEmployeeAllocation(userId: string) {
    // Find the employee being removed
    const employeeToRemove = this.selectedEmployeeAllocations().find(emp => emp.userId === userId);
    
    if (employeeToRemove) {
      // Check if this employee had an existing allocation when the form was loaded
      const initialEmployee = this.initialEmployeesWithAllocations().find(emp => emp.userId === userId);
      
      if (initialEmployee && initialEmployee.existingAllocationId) {
        // This employee had an existing allocation, so we need to track it for deletion
        this.pendingDeleteRequests.update(current => [
          ...current,
          {
            allocationId: initialEmployee.existingAllocationId!,
            userName: employeeToRemove.userName
          }
        ]);
      }
    }
    
    // Remove the employee from the form
    this.selectedEmployeeAllocations.update(current => 
      current.filter(emp => emp.userId !== userId)
    );
    this.updateAvailableEmployeesForSelection();
  }

  // Update employee's allocated hours
  updateEmployeeHours(userId: string, hours: number) {
    // Handle NaN or invalid input
    if (isNaN(hours)) {
      return;
    }
    
    // Validation for reasonable hours
    if (hours < 0) {
      this.toastr.warning('Allocated hours cannot be negative');
      return;
    }
    
    // Maximum hours per week: 9 hrs/day × 5 days + 50% overtime = 67.5 hours
    const MAX_WEEKLY_HOURS = 67.5;
    if (hours > MAX_WEEKLY_HOURS) {
      this.toastr.error(`Allocated hours cannot exceed ${MAX_WEEKLY_HOURS} hours per week (9 hrs/day × 5 days + overtime)`);
      return;
    }

    // Round to nearest 0.5 for clean display
    const roundedHours = Math.round(hours * 2) / 2;

    this.selectedEmployeeAllocations.update(current =>
      current.map(emp => 
        emp.userId === userId ? { ...emp, allocatedHours: roundedHours } : emp
      )
    );
  }

  onSubmit() {
    if (!this.canCreateOrEdit()) {
      this.toastr.error('You do not have permission to modify allocations');
      return;
    }
    
    if (this.allocationForm.valid && this.selectedEmployeeAllocations().length > 0) {
      const formValue = this.allocationForm.value;
      
      // Check for employees with zero hours
      const employeesWithZeroHours = this.selectedEmployeeAllocations().filter(emp => emp.allocatedHours <= 0);
      if (employeesWithZeroHours.length > 0) {
        const employeeNames = employeesWithZeroHours.map(emp => emp.userName).join(', ');
        this.toastr.warning(`Please enter allocation hours for: ${employeeNames}`);
        return;
      }
      
      if (this.editingAllocation()) {
        // Update existing allocation (single employee only)
        const employeeAllocation = this.selectedEmployeeAllocations()[0];
        const updateRequest = {
          allocatedHours: employeeAllocation.allocatedHours
        };
        
        this.allocationService.updateAllocation(this.editingAllocation()!.allocationId, updateRequest).subscribe({
          next: () => {
            this.toastr.success('Allocation updated successfully');
            this.closeModal();
            this.loadInitialData();
          },
          error: (error) => {
            this.toastr.error('Error updating allocation');
            console.error('Error updating allocation:', error);
          }
        });
      } else {
        // Check for existing allocations before creating new ones
        const existingAllocations = this.allocations();
        let createRequests: CreateAllocationRequest[] = [];
        let updateRequests: { allocationId: string; request: UpdateAllocationRequest; userName: string }[] = [];

        if (this.isMultiMonthWeek() && this.monthPeriods().length > 0) {
          // Create allocations for each month period for each employee using employee-specific hours
          const allRequests = this.selectedEmployeeAllocations().flatMap(emp => 
            this.monthPeriods().map((period, periodIndex) => {
              const periodHours = emp.periodHours?.[periodIndex] || 0;
              return {
                projectId: formValue.projectId,
                userId: emp.userId,
                userName: emp.userName,
                weekStartDate: period.startDate,
                weekEndDate: period.endDate,
                allocatedHours: periodHours
              };
            }).filter(request => request.allocatedHours > 0) // Only create allocations with hours > 0
          );

          if (allRequests.length === 0) {
            this.toastr.warning('Please enter allocation hours for at least one period for at least one employee');
            return;
          }

          // Separate into create and update based on existing allocations
          allRequests.forEach(request => {
            const existing = existingAllocations.find(a => 
              a.projectId === request.projectId && 
              a.userId === request.userId && 
              a.weekStartDate === request.weekStartDate &&
              a.weekEndDate === request.weekEndDate
            );

            if (existing) {
              updateRequests.push({
                allocationId: existing.allocationId,
                request: { allocatedHours: request.allocatedHours },
                userName: request.userName
              });
            } else {
              createRequests.push({
                projectId: request.projectId,
                userId: request.userId,
                weekStartDate: request.weekStartDate,
                weekEndDate: request.weekEndDate,
                allocatedHours: request.allocatedHours
              });
            }
          });
        } else {
          // Standard week allocation - check for overlapping allocations, not exact matches
          this.selectedEmployeeAllocations().forEach(emp => {
            // Find any existing allocation that overlaps with the selected period
            const overlappingAllocation = existingAllocations.find(a => {
              const normalizeDate = (dateStr: string): string => {
                const date = new Date(dateStr);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              };

              const allocStart = normalizeDate(a.weekStartDate);
              const allocEnd = normalizeDate(a.weekEndDate);
              const formStart = normalizeDate(formValue.weekStartDate);
              const formEnd = normalizeDate(formValue.weekEndDate);

              // Check if this allocation overlaps with the form period
              return a.projectId === formValue.projectId && 
                     a.userId === emp.userId && 
                     allocStart <= formEnd && 
                     allocEnd >= formStart;
            });

            if (overlappingAllocation) {
              // Update the existing overlapping allocation
              updateRequests.push({
                allocationId: overlappingAllocation.allocationId,
                request: { allocatedHours: emp.allocatedHours },
                userName: emp.userName
              });
            } else {
              // Create new allocation
              createRequests.push({
                projectId: formValue.projectId,
                userId: emp.userId,
                weekStartDate: formValue.weekStartDate,
                weekEndDate: formValue.weekEndDate,
                allocatedHours: emp.allocatedHours
              });
            }
          });
        }

        // Get pending deletions
        const deleteRequests = this.pendingDeleteRequests();

        // Show confirmation if there are updates, creates, or deletes
        if (updateRequests.length > 0 || deleteRequests.length > 0) {
          // Store pending requests
          this.pendingUpdateRequests.set(updateRequests);
          this.pendingCreateRequests.set(createRequests);
          // Note: pendingDeleteRequests is already set when employees are removed
          
          // Build confirmation details
          const details = [];
          if (deleteRequests.length > 0) {
            details.push(...deleteRequests.map(d => `DELETE: ${d.userName} - Remove existing allocation`));
          }
          if (updateRequests.length > 0) {
            details.push(...updateRequests.map(u => `UPDATE: ${u.userName} - ${u.request.allocatedHours} hours (will replace existing)`));
          }
          if (createRequests.length > 0) {
            details.push(`CREATE: ${createRequests.length} new allocation(s)`);
          }
          
          // Determine appropriate title and message based on operations
          let title = 'Confirm Changes?';
          let message = 'The following changes will be made:';
          
          if (deleteRequests.length > 0 && updateRequests.length === 0 && createRequests.length === 0) {
            title = 'Remove Allocations?';
            message = 'The following employees will have their allocations removed:';
          } else if (updateRequests.length > 0 && deleteRequests.length === 0 && createRequests.length === 0) {
            title = 'Update Existing Allocations?';
            message = 'Some employees already have allocations that overlap with the selected period. Do you want to update their existing allocations with the new hours?';
          } else if (createRequests.length > 0 && deleteRequests.length === 0 && updateRequests.length === 0) {
            // No confirmation needed for just creates - proceed directly
            this.executeAllocations(updateRequests, createRequests);
            return;
          }
          
          this.updateConfirmDialogData.set({
            title,
            message,
            type: 'warning',
            confirmText: 'Yes, Proceed',
            cancelText: 'Cancel',
            details,
            showDetailsAsAlert: false
          });
          this.showUpdateConfirmModal.set(true);
          return;
        }

        // If only creates, proceed directly
        this.executeAllocations(updateRequests, createRequests);
      }
    } else if (this.selectedEmployeeAllocations().length === 0) {
      this.toastr.warning('Please select at least one employee for allocation');
    }
  }

  // Handle week start date change to detect multi-month weeks
  onWeekStartDateChange(weekStartDate: string) {
    this.formWeekStartDate.set(weekStartDate);
    this.checkMultiMonthWeek();
    this.loadCapacityForSelectedEmployees(); // Load capacity when dates change
  }

  // Handle week end date change to detect multi-month weeks
  onWeekEndDateChange(weekEndDate: string) {
    this.checkMultiMonthWeek();
    this.loadCapacityForSelectedEmployees(); // Load capacity when dates change
  }

  // Refresh weekly capacity for all selected employees
  private refreshWeeklyCapacity() {
    const weekStartDate = this.allocationForm.get('weekStartDate')?.value;
    const weekEndDate = this.allocationForm.get('weekEndDate')?.value;
    
    if (!weekStartDate || !weekEndDate) {
      return;
    }

    // Get user IDs from selected employees
    let userIds: string[] = [];
    
    if (this.editingAllocation()) {
      // In edit mode, just get the single employee
      const employeeId = this.allocationForm.get('employeeId')?.value;
      if (employeeId) {
        userIds = [employeeId];
      }
    } else {
      // In create mode, get all selected employees
      const selectedEmployees = this.selectedEmployeeAllocations();
      userIds = selectedEmployees.map(emp => emp.userId);
    }

    if (userIds.length === 0) {
      return;
    }

    // Fetch updated capacity
    this.allocationService.getWeeklyCapacity(weekStartDate, weekEndDate, userIds).subscribe({
      next: (capacities) => {
        const capacityMap = new Map();
        capacities.forEach(cap => capacityMap.set(cap.userId, cap));
        this.weeklyCapacities.set(capacityMap);
      },
      error: (error) => {
        console.error('Error fetching weekly capacity:', error);
      }
    });
  }

  // Check if the selected week spans multiple months
  private checkMultiMonthWeek() {
    const weekStartDate = this.allocationForm.get('weekStartDate')?.value;
    const weekEndDate = this.allocationForm.get('weekEndDate')?.value;
    
    if (weekStartDate && weekEndDate) {
      // Check if start and end dates are in different months
      const startDate = new Date(weekStartDate);
      const endDate = new Date(weekEndDate);
      const isMultiMonth = startDate.getMonth() !== endDate.getMonth() || startDate.getFullYear() !== endDate.getFullYear();
      
      this.isMultiMonthWeek.set(isMultiMonth);
      
      if (isMultiMonth) {
        // Use the service method with the start date (it calculates the proper week end internally)
        const periods = this.allocationService.getMonthPeriodsForWeek(weekStartDate);
        const monthAllocations = periods.map(period => ({
          ...period,
          allocatedHours: 0
        }));
        this.monthPeriods.set(monthAllocations);
        
        // Automatically initialize periodHours for existing employees
        this.selectedEmployeeAllocations.update(current =>
          current.map(emp => ({
            ...emp,
            periodHours: new Array(periods.length).fill(0)
          }))
        );
      } else {
        this.monthPeriods.set([]);
      }
    }
  }

  // Update hours for a specific month period (kept for reference but not used in automatic mode)
  updateMonthPeriodHours(index: number, hours: number) {
    this.monthPeriods.update(current => 
      current.map((period, i) => 
        i === index ? { ...period, allocatedHours: hours } : period
      )
    );
  }

  deleteAllocation(allocation: WeeklyAllocation) {
    if (!this.canCreateOrEdit()) {
      this.toastr.error('You do not have permission to delete allocations');
      return;
    }
    
    // Create confirmation dialog data
    this.deleteDialogData.set({
      title: 'Confirm Deletion',
      message: 'Are you sure you want to delete this allocation?',
      type: 'danger',
      confirmText: 'Delete Allocation',
      cancelText: 'Cancel',
      details: [
        `Employee: ${allocation.userName}`,
        `Project: ${allocation.projectName}`,
        `Week: ${new Date(allocation.weekStartDate).toLocaleDateString()} - ${new Date(allocation.weekEndDate).toLocaleDateString()}`,
        `Hours: ${allocation.allocatedHours}h`
      ],
      showDetailsAsAlert: false
    });
    
    // Store allocation ID for deletion
    this.allocationIdToDelete = allocation.allocationId;
    this.showDeleteModal.set(true);
  }

  private allocationIdToDelete: string = '';

  private executeAllocations(
    updateRequests: { allocationId: string; request: UpdateAllocationRequest; userName: string }[],
    createRequests: CreateAllocationRequest[]
  ) {
    // Get delete requests
    const deleteRequests = this.pendingDeleteRequests();
    
    // Execute updates, creates, and deletes
    const updatePromises = updateRequests.map(u => 
      this.allocationService.updateAllocation(u.allocationId, u.request).toPromise()
    );
    const createPromises = createRequests.map(request => 
      this.allocationService.createAllocation(request).toPromise()
    );
    const deletePromises = deleteRequests.map(d =>
      this.allocationService.deleteAllocation(d.allocationId).toPromise()
    );

    Promise.all([...updatePromises, ...createPromises, ...deletePromises]).then((results) => {
      const updatedCount = updateRequests.length;
      const createdCount = createRequests.length;
      const deletedCount = deleteRequests.length;
      
      // Build success message
      const messages = [];
      if (deletedCount > 0) messages.push(`${deletedCount} allocation(s) removed`);
      if (updatedCount > 0) messages.push(`${updatedCount} allocation(s) updated`);
      if (createdCount > 0) messages.push(`${createdCount} allocation(s) created`);
      
      if (messages.length > 0) {
        this.toastr.success(messages.join(' and ') + ' successfully');
      }
      
      this.closeModal();
      this.loadInitialData();
    }).catch((error) => {
      if (error.status === 409) {
        this.toastr.error('Error: Duplicate allocation detected. Please refresh and try again.');
      } else {
        // Check for deleted project error
        let errorMessage = error.error?.message || error.message || 'Unknown error';
        const isDeletedProjectError = errorMessage.toLowerCase().includes('project not found') || 
                                     errorMessage.toLowerCase().includes('project has been deleted') ||
                                     errorMessage.toLowerCase().includes('deleted project');
        
        if (isDeletedProjectError) {
          this.toastr.error('The selected project has been deleted and is no longer available for allocations. Please refresh the page and select a different project.');
        } else {
          this.toastr.error('Error processing allocations: ' + errorMessage);
        }
      }
      console.error('Error processing allocations:', error);
    });
  }

  onUpdateConfirmed() {
    const updateRequests = this.pendingUpdateRequests();
    const createRequests = this.pendingCreateRequests();
    
    this.closeUpdateConfirmModal();
    this.executeAllocations(updateRequests, createRequests);
  }

  closeUpdateConfirmModal() {
    this.showUpdateConfirmModal.set(false);
    this.updateConfirmDialogData.set(null);
    this.pendingUpdateRequests.set([]);
    this.pendingCreateRequests.set([]);
    this.pendingDeleteRequests.set([]);
  }

  onDeleteConfirmed() {
    if (!this.allocationIdToDelete) return;

    this.allocationService.deleteAllocation(this.allocationIdToDelete).subscribe({
      next: () => {
        this.toastr.success('Allocation deleted successfully');
        this.closeDeleteModal();
        this.loadInitialData();
      },
      error: (error) => {
        this.toastr.error('Error deleting allocation');
        console.error('Error deleting allocation:', error);
      }
    });
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.deleteDialogData.set(null);
    this.allocationIdToDelete = '';
  }

  getUtilizationBadgeClass(percentage: number): string {
    if (percentage >= 90) return 'badge bg-danger';
    if (percentage >= 70) return 'badge bg-warning';
    if (percentage >= 50) return 'badge bg-success';
    return 'badge bg-secondary';
  }

  getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active': return 'badge bg-success';
      case 'completed': return 'badge bg-primary';
      case 'on-hold': return 'badge bg-warning';
      case 'cancelled': return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  }

  // Calculate number of days in allocation period
  getAllocationDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
    return diffDays;
  }

  // Load capacity for all selected employees
  private loadCapacityForSelectedEmployees() {
    const weekStartDate = this.allocationForm.get('weekStartDate')?.value;
    const weekEndDate = this.allocationForm.get('weekEndDate')?.value;
    const selectedEmployees = this.selectedEmployeeAllocations();
    
    console.log('🔄 loadCapacityForSelectedEmployees called');
    console.log('  - weekStartDate:', weekStartDate);
    console.log('  - weekEndDate:', weekEndDate);
    console.log('  - selectedEmployees:', selectedEmployees.map(e => ({userId: e.userId, userName: e.userName})));
    
    // 🧹 FORCE CLEAR ALL CACHES TO PREVENT STALE DATA
    this.weeklyCapacities.set(new Map());
    console.log('🧹 Cleared weeklyCapacities cache before loading fresh data');
    
    if (!weekStartDate || !weekEndDate || selectedEmployees.length === 0) {
      console.log('❌ Missing required data for capacity loading');
      return;
    }

    const userIds = selectedEmployees.map(emp => emp.userId);
    console.log('📞 Making API call for userIds:', userIds);
    
    this.allocationService.getWeeklyCapacity(weekStartDate, weekEndDate, userIds).subscribe({
      next: (capacities) => {
        console.log('✅ Received capacity data from API:', capacities);
        console.log('📡 RAW API RESPONSE (JSON):', JSON.stringify(capacities, null, 2));
        
        capacities.forEach(cap => {
          console.log(`\n🔍 DETAILED CAPACITY BREAKDOWN for ${cap.userName}:`);
          console.log(`  - userId: ${cap.userId}`);
          console.log(`  - weekStartDate: ${cap.weekStartDate}`);
          console.log(`  - weekEndDate: ${cap.weekEndDate}`);
          console.log(`  - totalDays: ${cap.totalDays}`);
          console.log(`  - workingDays: ${cap.workingDays} (total Mon-Fri days)`);
          console.log(`  - holidayDays: ${cap.holidayDays}`);
          console.log(`  - leaveDays: ${cap.leaveDays} (approved leave)`);
          console.log(`  - actualWorkingDays: ${cap.actualWorkingDays} (workingDays - holidayDays - leaveDays)`);
          console.log(`  - capacityHours: ${cap.capacityHours} (actualWorkingDays × 9)`);
          console.log(`  - leaveHours: ${cap.leaveHours} (leaveDays × 9)`);
          console.log(`  - availableHours: ${cap.availableHours} (capacityHours - existing allocations)`);
          
          console.log(`\n🔍 TYPE CHECK:`);
          console.log(`  - typeof actualWorkingDays: ${typeof cap.actualWorkingDays}`);
          console.log(`  - typeof capacityHours: ${typeof cap.capacityHours}`);
          console.log(`  - typeof leaveHours: ${typeof cap.leaveHours}`);
          console.log(`  - typeof availableHours: ${typeof cap.availableHours}`);
          
          // Verify calculation
          const expectedActualWorkingDays = cap.workingDays - cap.holidayDays - cap.leaveDays;
          const expectedCapacityHours = expectedActualWorkingDays * 9;
          const expectedLeaveHours = cap.leaveDays * 9;
          
          console.log(`\n🧮 CALCULATION VERIFICATION:`);
          console.log(`  - Expected actualWorkingDays: ${cap.workingDays} - ${cap.holidayDays} - ${cap.leaveDays} = ${expectedActualWorkingDays}`);
          console.log(`  - Actual actualWorkingDays: ${cap.actualWorkingDays}`);
          console.log(`  - Expected capacityHours: ${expectedActualWorkingDays} × 9 = ${expectedCapacityHours}`);
          console.log(`  - Actual capacityHours: ${cap.capacityHours}`);
          console.log(`  - Expected leaveHours: ${cap.leaveDays} × 9 = ${expectedLeaveHours}`);
          console.log(`  - Actual leaveHours: ${cap.leaveHours}`);
          
          if (Math.abs(cap.capacityHours - expectedCapacityHours) > 0.01) {
            console.log(`❌ FRONTEND DATA CORRUPTION: capacityHours should be ${expectedCapacityHours} but got ${cap.capacityHours}`);
            console.log(`   Backend sent correct data, but frontend received corrupted values!`);
          } else {
            console.log(`✅ Frontend received correct data!`);
          }
          
          if (Math.abs(cap.leaveHours - expectedLeaveHours) > 0.01) {
            console.log(`❌ LEAVE HOURS ERROR: leaveHours should be ${expectedLeaveHours} but got ${cap.leaveHours}`);
          }
          
          if (Math.abs(cap.actualWorkingDays - expectedActualWorkingDays) > 0.01) {
            console.log(`❌ ACTUAL WORKING DAYS ERROR: actualWorkingDays should be ${expectedActualWorkingDays} but got ${cap.actualWorkingDays}`);
          }
        });
        
        const capacityMap = new Map();
        capacities.forEach(cap => {
          capacityMap.set(cap.userId, cap);
        });
        this.weeklyCapacities.set(capacityMap);
        console.log('💾 Updated weeklyCapacities signal');
      },
      error: (error) => {
        console.error('❌ Error loading capacity for selected employees:', error);
      }
    });
  }

  // Load capacity for a single user on-demand
  private loadCapacityForUser(userId: string) {
    const weekStartDate = this.allocationForm.get('weekStartDate')?.value;
    const weekEndDate = this.allocationForm.get('weekEndDate')?.value;
    
    if (!weekStartDate || !weekEndDate) {
      return;
    }

    this.allocationService.getWeeklyCapacity(weekStartDate, weekEndDate, [userId]).subscribe({
      next: (capacities) => {
        if (capacities && capacities.length > 0) {
          const capacity = capacities[0];
          this.weeklyCapacities.update(current => {
            const newMap = new Map(current);
            newMap.set(capacity.userId, capacity);
            return newMap;
          });
        }
      },
      error: (error) => {
        console.error('Error fetching capacity for user:', error);
      }
    });
  }

  // Get weekly capacity for a specific user
  getUserWeeklyCapacity(userId: string): any | null {
    const capacityMap = this.weeklyCapacities();
    return capacityMap.get(userId) || null;
  }

  // Get formatted capacity string for display
  getFormattedCapacity(userId: string): string {
    const capacity = this.getUserWeeklyCapacity(userId);
    
    if (!capacity) {
      return 'Available: 45h (Standard Week)';
    }

    // Show capacity hours (actual hours they can work this week after leave/holiday deductions)
    // not availableHours (which is after existing allocations are subtracted)
    let display = `Capacity: ${capacity.capacityHours}h`;
    
    // Add leave info if present
    if (capacity.leaveDays > 0) {
      const leaveStr = capacity.leaveDays === 0.5 ? '0.5 day' : `${capacity.leaveDays} day${capacity.leaveDays > 1 ? 's' : ''}`;
      display += ` | ${leaveStr} leave`;
    }
    
    // Add holiday info if present  
    if (capacity.holidayDays > 0) {
      display += ` | ${capacity.holidayDays} holiday${capacity.holidayDays > 1 ? 's' : ''}`;
    }

    // Show available hours (after existing allocations) if different from capacity
    if (capacity.availableHours !== capacity.capacityHours) {
      display += ` | ${capacity.availableHours}h available`;
    }
    
    return display;
  }

  // Get capacity details for tooltip
  getCapacityDetails(userId: string): string {
    const capacity = this.getUserWeeklyCapacity(userId);
    if (!capacity) {
      return 'Standard working week: 5 days × 9 hours = 45 hours';
    }

    const details: string[] = [];
    details.push(`Total Days: ${capacity.totalDays}`);
    details.push(`Working Days: ${capacity.workingDays}`);
    
    if (capacity.holidayDays > 0) {
      details.push(`Holidays: ${capacity.holidayDays} day${capacity.holidayDays > 1 ? 's' : ''}`);
    }
    
    if (capacity.leaveDays > 0) {
      const leaveDaysStr = capacity.leaveDays % 1 === 0 
        ? capacity.leaveDays.toString() 
        : capacity.leaveDays.toFixed(1);
      details.push(`Approved Leaves: ${leaveDaysStr} day${capacity.leaveDays > 1 ? 's' : ''}`);
    }
    
    details.push(`Actual Working Days: ${capacity.actualWorkingDays}`);
    details.push(`Weekly Capacity: ${capacity.capacityHours}h`);
    if (capacity.leaveHours > 0) {
      details.push(`Leave Hours Deducted: ${capacity.leaveHours}h`);
    }
    details.push(`Available for New Allocations: ${capacity.availableHours}h`);

    return details.join(' | ');
  }

  getTotalAllocatedHours(): number {
    const selectedUserId = this.selectedUserId();
    
    if (!selectedUserId) {
      return 0;
    }
    
    // Filter by employee only - allocations are already filtered by week
    return this.filteredAllocations().reduce((sum, allocation) => 
      sum + allocation.allocatedHours, 0
    );
  }

  // Helper method to format allocation periods for month-split allocations
  formatAllocationPeriods(allocations: WeeklyAllocation[]): string {
    if (allocations.length === 1) {
      const allocation = allocations[0];
      return `${new Date(allocation.weekStartDate).toLocaleDateString()} - ${new Date(allocation.weekEndDate).toLocaleDateString()}`;
    }
    
    return allocations.map(a => 
      `${new Date(a.weekStartDate).toLocaleDateString()} - ${new Date(a.weekEndDate).toLocaleDateString()} (${a.allocatedHours}h)`
    ).join(', ');
  }

  // Helper method to get month name from allocation
  getMonthName(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // Helper method to check if allocation spans multiple months
  isMultiMonthAllocation(allocations: WeeklyAllocation[]): boolean {
    if (allocations.length <= 1) return false;
    
    const months = new Set(allocations.map(a => 
      new Date(a.weekStartDate).getMonth() + new Date(a.weekStartDate).getFullYear() * 12
    ));
    
    return months.size > 1;
  }

  // Helper method to get existing allocation period for an employee
  getExistingAllocationPeriod(employee: EmployeeAllocation): string {
    if (!employee.existingAllocationStartDate || !employee.existingAllocationEndDate) {
      return '';
    }
    
    const startDate = new Date(employee.existingAllocationStartDate);
    const endDate = new Date(employee.existingAllocationEndDate);
    
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  }

  // Helper method to check if employee has existing allocation
  hasExistingAllocation(employee: EmployeeAllocation): boolean {
    return !!(employee.existingAllocationStartDate && employee.existingAllocationEndDate);
  }

  // TrackBy function for employee list
  trackByUserId(index: number, employee: EmployeeAllocation): string {
    return employee.userId;
  }

  // TrackBy function for period index
  trackByPeriodIndex(index: number, period: MonthPeriodAllocation): number {
    return index;
  }

  // Get hours for a specific employee and period
  getEmployeePeriodHours(userId: string, periodIndex: number): number {
    const employee = this.selectedEmployeeAllocations().find(emp => emp.userId === userId);
    if (employee?.periodHours && employee.periodHours[periodIndex] !== undefined) {
      return employee.periodHours[periodIndex];
    }
    return 0;
  }

  // Update hours for a specific employee and period
  updateEmployeePeriodHours(userId: string, periodIndex: number, hours: number) {
    // Validation for reasonable hours
    if (hours < 0) {
      this.toastr.warning('Allocated hours cannot be negative');
      return;
    }
    
    // Maximum hours per period: 9 hrs/day × 5 days + 50% overtime = 67.5 hours
    const MAX_PERIOD_HOURS = 67.5;
    if (hours > MAX_PERIOD_HOURS) {
      this.toastr.error(`Allocated hours cannot exceed ${MAX_PERIOD_HOURS} hours per period (9 hrs/day × 5 days + overtime)`);
      return;
    }
    
    const employees = this.selectedEmployeeAllocations();
    const employeeIndex = employees.findIndex(emp => emp.userId === userId);
    
    if (employeeIndex !== -1) {
      const updatedEmployee = { ...employees[employeeIndex] };
      
      // Initialize periodHours array if it doesn't exist
      if (!updatedEmployee.periodHours) {
        updatedEmployee.periodHours = new Array(this.monthPeriods().length).fill(0);
      }
      
      // Update the specific period hours
      updatedEmployee.periodHours[periodIndex] = hours;
      
      // Update the total allocatedHours (sum of all periods)
      updatedEmployee.allocatedHours = updatedEmployee.periodHours.reduce((sum, h) => sum + h, 0);
      
      // Update the array
      const updatedEmployees = [...employees];
      updatedEmployees[employeeIndex] = updatedEmployee;
      this.selectedEmployeeAllocations.set(updatedEmployees);
    }
  }

  // Export functionality
  exportToCsv() {
    if (!this.exportFromDate() || !this.exportToDate()) {
      this.toastr.error('Please select from and to dates for export');
      return;
    }

    const fromDate = this.exportFromDate();
    const toDate = this.exportToDate();
    const projectId = this.selectedProjectId();
    const userId = this.selectedUserId();

    this.isExporting.set(true);

    this.allocationService.exportToCsv(fromDate, toDate, projectId, userId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename based on filters
        let filename = `allocations-${fromDate}-to-${toDate}`;
        if (projectId) {
          const project = this.availableProjects().find(p => p.projectId === projectId);
          filename += `-${project?.projectName || 'project'}`;
        }
        if (userId) {
          const user = this.availableEmployees().find(u => u.userId === userId);
          filename += `-${user?.userName || 'user'}`;
        }
        filename += '.csv';
        
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
        this.toastr.success('Allocations exported successfully');
        this.isExporting.set(false);
      },
      error: (err) => {
        console.error('Failed to export allocations:', err);
        this.toastr.error('Failed to export allocations');
        this.isExporting.set(false);
      }
    });
  }

  // Set export date range to current month
  setCurrentMonth() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    this.exportFromDate.set(firstDay.toISOString().split('T')[0]);
    this.exportToDate.set(lastDay.toISOString().split('T')[0]);
    this.selectedExportPeriod.set('this-month');
  }

  // Set export date range to previous month
  setPreviousMonth() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    
    this.exportFromDate.set(firstDay.toISOString().split('T')[0]);
    this.exportToDate.set(lastDay.toISOString().split('T')[0]);
    this.selectedExportPeriod.set('prev-month');
  }

  // Set export date range to current quarter
  setCurrentQuarter() {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const firstDay = new Date(now.getFullYear(), quarter * 3, 1);
    const lastDay = new Date(now.getFullYear(), quarter * 3 + 3, 0);
    
    this.exportFromDate.set(firstDay.toISOString().split('T')[0]);
    this.exportToDate.set(lastDay.toISOString().split('T')[0]);
    this.selectedExportPeriod.set('this-quarter');
  }

  // Handle manual date changes to set export period to custom
  onExportDateChange() {
    this.selectedExportPeriod.set('custom');
  }

  // Helper methods for template
  getSelectedProjectName(): string {
    const projectId = this.selectedProjectId();
    if (!projectId) return '';
    const project = this.availableProjects().find(p => p.projectId === projectId);
    return project ? `${project.projectName} - ${project.clientName}` : '';
  }

  getSelectedEmployeeName(): string {
    const userId = this.selectedUserId();
    if (!userId) return '';
    const employee = this.availableEmployees().find(e => e.userId === userId);
    return employee?.userName || '';
  }

  // Get available hours for the selected user (uses actual capacity after holidays/leaves)
  // This method now properly considers holidays and approved leave days when calculating available hours
  getAvailableHours(): number {
    const selectedUserId = this.selectedUserId();
    if (!selectedUserId) return 0;
    
    // Get the actual weekly capacity that considers holidays and leaves
    const capacity = this.getUserWeeklyCapacity(selectedUserId);
    if (capacity) {
      // Use the availableHours from capacity data (already considers existing allocations)
      return Math.max(0, capacity.availableHours);
    }
    
    // Fallback to base calculation if capacity data not available
    const baseCapacity = 45; // Base weekly capacity in hours
    const allocatedHours = this.getTotalAllocatedHours();
    return Math.max(0, baseCapacity - allocatedHours);
  }

  // Get total utilized hours for the selected user (from timesheet entries)
  getTotalUtilizedHours(): number {
    const selectedUserId = this.selectedUserId();
    const currentWeekStart = this.currentWeekStart();
    
    if (!selectedUserId || !currentWeekStart) {
      return 0;
    }
    
    // Create cache key
    const cacheKey = `${selectedUserId}-${currentWeekStart}`;
    const cachedValue = this.utilizedHoursCache().get(cacheKey);
    
    return cachedValue || 0;
  }

  // Get actual capacity hours for the selected user (after holidays/leaves)
  getActualCapacityHours(): number {
    const selectedUserId = this.selectedUserId();
    if (!selectedUserId) return 45; // Default capacity
    
    const capacity = this.getUserWeeklyCapacity(selectedUserId);
    if (capacity) {
      return capacity.capacityHours;
    }
    
    return 45; // Default capacity if no data available
  }

  // Get utilization percentage for the selected user (uses actual capacity after holidays/leaves)
  getUtilizationPercentage(): number {
    const selectedUserId = this.selectedUserId();
    if (!selectedUserId) return 0;
    
    // Get the actual weekly capacity that considers holidays and leaves
    const capacity = this.getUserWeeklyCapacity(selectedUserId);
    const allocatedHours = this.getTotalAllocatedHours();
    
    if (capacity && capacity.capacityHours > 0) {
      // Use actual capacity hours (after holidays/leaves deductions)
      return Math.round((allocatedHours / capacity.capacityHours) * 100);
    }
    
    // Fallback to base calculation if capacity data not available
    const baseCapacity = 45; // Base weekly capacity in hours
    return Math.round((allocatedHours / baseCapacity) * 100);
  }

  // Project-level summary methods for "By Project" view
  getProjectTotalAllocatedHours(): number {
    const selectedProjectId = this.selectedProjectId();
    
    if (!selectedProjectId) {
      return 0;
    }
    
    // Filter by project only - allocations are already filtered by week
    return this.filteredAllocations().reduce((sum, allocation) => 
      sum + allocation.allocatedHours, 0
    );
  }

  getProjectEmployeeCount(): number {
    const selectedProjectId = this.selectedProjectId();
    
    if (!selectedProjectId) {
      return 0;
    }
    
    // Filter by project only - allocations are already filtered by week
    const uniqueEmployees = new Set(
      this.filteredAllocations().map(allocation => allocation.userId)
    );
    
    return uniqueEmployees.size;
  }

  getProjectAverageUtilization(): number {
    const selectedProjectId = this.selectedProjectId();
    
    if (!selectedProjectId) {
      return 0;
    }
    
    // Filter by project only - allocations are already filtered by week
    const projectAllocations = this.filteredAllocations();
    
    if (projectAllocations.length === 0) {
      return 0;
    }
    
    const avgUtilization = projectAllocations.reduce((sum, allocation) => 
      sum + allocation.utilizationPercentage, 0
    ) / projectAllocations.length;
    
    return Math.round(avgUtilization);
  }

  // Role-based access control methods
  canCreateOrEdit(): boolean {
    // Only ADMIN and APPROVER roles can create/edit allocations
    // EMPLOYEE role can only view their own allocations
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.role === 'ADMIN' || currentUser?.role === 'APPROVER';
  }

  canView(): boolean {
    return true; // All authenticated users can view (backend filters data)
  }

  isReadOnlyUser(): boolean {
    return this.isEmployee(); // Employees are read-only
  }

  isEmployee(): boolean {
    return this.authService.getCurrentUser()?.role === 'EMPLOYEE';
  }

  isApprover(): boolean {
    return this.authService.isApprover();
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  // Helper methods for template
  getEmployeesWithAllocations(): number {
    return this.selectedEmployeeAllocations().filter(emp => emp.allocatedHours > 0).length;
  }

  getEmployeesWithoutAllocations(): number {
    return this.selectedEmployeeAllocations().filter(emp => emp.allocatedHours === 0).length;
  }

  hasEmployeesWithAllocations(): boolean {
    return this.getEmployeesWithAllocations() > 0;
  }
}
