import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { AllocationService, WeeklyAllocation, CreateAllocationRequest, AllocationSummary, EmployeeAllocationSummary, WeeklyCapacity } from '../../core/services/allocation.service';
import { ProjectsService } from '../../core/services/projects.service';
import { UserManagementService, AppUser } from '../../core/services/user-management.service';
import { TimesheetsService } from '../../core/services/timesheets.service';
import { AuthService } from '../../core/services/auth.service';
import { Project } from '../../shared/models';

// Interface for multiple employee allocation
export interface EmployeeAllocation {
  userId: string;
  userName: string;
  allocatedHours: number;
  periodHours?: number[]; // Hours for each month period when splitting by months
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule],
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
        const members = projectDetails.projectMembers.map(member => ({
          userId: member.userId,
          userName: `${member.firstName} ${member.lastName}`,
          role: member.role,
          projectRole: member.projectRole
        }));
        this.projectMembers.set(members);
        
        // Auto-add project members to the allocation list with default hours
        this.autoAddProjectMembers(members);
      },
      error: (error) => {
        console.error('Error loading project members:', error);
        this.projectMembers.set([]);
      }
    });
  }

  private autoAddProjectMembers(members: {userId: string, userName: string, role: string, projectRole: string}[]) {
    // Get the selected project ID and week dates from the form
    const projectId = this.allocationForm.get('projectId')?.value;
    const weekStartDate = this.allocationForm.get('weekStartDate')?.value;
    const weekEndDate = this.allocationForm.get('weekEndDate')?.value;

    // Fetch weekly capacity for all members
    if (weekStartDate && weekEndDate && members.length > 0) {
      const userIds = members.map(m => m.userId);
      this.allocationService.getWeeklyCapacity(weekStartDate, weekEndDate, userIds).subscribe({
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
    }

    // For employees, only add themselves to the allocation list
    if (this.isEmployee()) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        const currentMember = members.find(m => m.userId === currentUser.userId);
        if (currentMember) {
          // Check if there's an existing allocation for this user, project, and week
          const existingAllocation = this.allocations().find(a => 
            a.userId === currentUser.userId && 
            a.projectId === projectId &&
            a.weekStartDate === weekStartDate &&
            a.weekEndDate === weekEndDate
          );

          const allocation: EmployeeAllocation = {
            userId: currentMember.userId,
            userName: currentMember.userName,
            allocatedHours: existingAllocation ? existingAllocation.allocatedHours : 0
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
          // Employee is not a team member - keep them in the list (they can still allocate themselves)
          // Check if there's an existing allocation for this user, project, and week
          const existingAllocation = this.allocations().find(a => 
            a.userId === currentUser.userId && 
            a.projectId === projectId &&
            a.weekStartDate === weekStartDate &&
            a.weekEndDate === weekEndDate
          );

          this.selectedEmployeeAllocations.set([{
            userId: currentUser.userId,
            userName: currentUser.name,
            allocatedHours: existingAllocation ? existingAllocation.allocatedHours : 0
          }]);
          this.updateAvailableEmployeesForSelection();
          
          if (existingAllocation) {
            this.toastr.info(`Existing allocation found: ${existingAllocation.allocatedHours} hours. You can update the hours below.`);
          }
        }
      }
      return;
    }
    
    // For approvers and admins, add all project members
    // Clear existing allocations first
    this.selectedEmployeeAllocations.set([]);
    
    // Add all project members and pre-fill existing allocation hours
    const allocations: EmployeeAllocation[] = members.map(member => {
      // Check if there's an existing allocation for this member, project, and week
      const existingAllocation = this.allocations().find(a => 
        a.userId === member.userId && 
        a.projectId === projectId &&
        a.weekStartDate === weekStartDate &&
        a.weekEndDate === weekEndDate
      );

      const allocation: EmployeeAllocation = {
        userId: member.userId,
        userName: member.userName,
        allocatedHours: existingAllocation ? existingAllocation.allocatedHours : 0
      };

      // Initialize periodHours if multi-month week is detected
      if (this.isMultiMonthWeek() && this.monthPeriods().length > 0) {
        allocation.periodHours = new Array(this.monthPeriods().length).fill(0);
      }

      return allocation;
    });

    this.selectedEmployeeAllocations.set(allocations);
    this.updateAvailableEmployeesForSelection();
    
    // Check if any existing allocations were found
    const existingCount = allocations.filter(a => a.allocatedHours > 0).length;
    
    if (existingCount > 0) {
      this.toastr.info(`Auto-added ${members.length} project team members. ${existingCount} member(s) have existing allocations pre-filled.`);
    } else if (members.length > 0) {
      this.toastr.info(`Auto-added ${members.length} project team members. Please enter allocation hours for each member.`);
    }
  }

  resetToProjectDefaults() {
    const projectMembers = this.projectMembers();
    if (projectMembers.length > 0) {
      this.autoAddProjectMembers(projectMembers);
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
    }
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
    
    console.log('openCreateModal called');
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
        }
      }
    }
    
    this.updateAvailableEmployeesForSelection();
    this.editingAllocation.set(null);
    this.showCreateModal.set(true);
    console.log('Modal opened - availableEmployees:', this.availableEmployees());
    console.log('Modal opened - availableEmployeesForSelection:', this.availableEmployeesForSelection());
  }

  openEditModal(allocation: WeeklyAllocation) {
    if (!this.canCreateOrEdit()) {
      this.toastr.error('You do not have permission to edit allocations');
      return;
    }
    
    this.allocationForm.patchValue({
      projectId: allocation.projectId,
      weekStartDate: allocation.weekStartDate,
      weekEndDate: allocation.weekEndDate
    });
    this.formWeekStartDate.set(allocation.weekStartDate); // Update signal manually
    // For edit mode, set single employee allocation
    this.selectedEmployeeAllocations.set([{
      userId: allocation.userId,
      userName: allocation.userName,
      allocatedHours: allocation.allocatedHours
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
    
    this.editingAllocation.set(allocation);
    this.showCreateModal.set(true);
  }

  closeModal() {
    this.showCreateModal.set(false);
    this.editingAllocation.set(null);
    this.selectedEmployeeAllocations.set([]);
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
    console.log('updateAvailableEmployeesForSelection:');
    console.log('- allEmployees:', allEmployees);
    console.log('- selectedIds:', selectedIds);
    console.log('- availableEmployees:', availableEmployees);
    this.availableEmployeesForSelection.set(availableEmployees);
  }

  // Add employee to allocation list
  addEmployeeAllocation(userId: string) {
    console.log('addEmployeeAllocation called with userId:', userId);
    const employee = this.availableEmployees().find(emp => emp.userId === userId);
    console.log('Found employee:', employee);
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

      console.log('Adding employee allocation:', newEmployeeAllocation);
      this.selectedEmployeeAllocations.update(current => [...current, newEmployeeAllocation]);
      this.updateAvailableEmployeesForSelection();
      console.log('Updated selectedEmployeeAllocations:', this.selectedEmployeeAllocations());
    }
  }

  // Handle employee selection from dropdown
  onEmployeeAdd(userId: string) {
    console.log('onEmployeeAdd called with userId:', userId);
    if (userId && userId !== '') {
      this.addEmployeeAllocation(userId);
      // Clear the dropdown selection immediately
      this.selectedEmployeeForDropdown.set(null);
    }
  }

  // Remove employee from allocation list
  removeEmployeeAllocation(userId: string) {
    this.selectedEmployeeAllocations.update(current => 
      current.filter(emp => emp.userId !== userId)
    );
    this.updateAvailableEmployeesForSelection();
  }

  // Update employee's allocated hours
  updateEmployeeHours(userId: string, hours: number) {
    // Basic validation - only check for negative values
    if (hours < 0) {
      this.toastr.warning('Allocated hours cannot be negative');
      return;
    }

    this.selectedEmployeeAllocations.update(current =>
      current.map(emp => 
        emp.userId === userId ? { ...emp, allocatedHours: hours } : emp
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

        if (this.isMultiMonthWeek() && this.monthPeriods().length > 0) {
          // Create allocations for each month period for each employee using employee-specific hours
          createRequests = this.selectedEmployeeAllocations().flatMap(emp => 
            this.monthPeriods().map((period, periodIndex) => {
              const periodHours = emp.periodHours?.[periodIndex] || 0;
              return {
                projectId: formValue.projectId,
                userId: emp.userId,
                weekStartDate: period.startDate,
                weekEndDate: period.endDate,
                allocatedHours: periodHours
              };
            }).filter(request => request.allocatedHours > 0) // Only create allocations with hours > 0
          );

          if (createRequests.length === 0) {
            this.toastr.warning('Please enter allocation hours for at least one period for at least one employee');
            return;
          }
        } else {
          // Standard week allocation
          createRequests = this.selectedEmployeeAllocations().map(emp => ({
            projectId: formValue.projectId,
            userId: emp.userId,
            weekStartDate: formValue.weekStartDate,
            weekEndDate: formValue.weekEndDate,
            allocatedHours: emp.allocatedHours
          }));
        }

        // Check for duplicates
        const duplicates = createRequests.filter(request => 
          existingAllocations.some(existing => 
            existing.projectId === request.projectId && 
            existing.userId === request.userId && 
            existing.weekStartDate === request.weekStartDate
          )
        );

        if (duplicates.length > 0) {
          const duplicateEmployees = duplicates.map(dup => 
            this.selectedEmployeeAllocations().find(emp => emp.userId === dup.userId)?.userName
          ).join(', ');
          this.toastr.warning(`Allocation already exists for: ${duplicateEmployees}. Please check existing allocations.`);
          return;
        }

        // Create all allocations
        const allocationPromises = createRequests.map(request => 
          this.allocationService.createAllocation(request).toPromise()
        );

        Promise.all(allocationPromises).then((results) => {
          // Each result is now a single allocation
          this.toastr.success(`${results.length} allocation(s) created successfully`);
          this.closeModal();
          this.loadInitialData();
        }).catch((error) => {
          if (error.status === 409) {
            this.toastr.error('One or more allocations already exist for this project and week. Please check existing allocations.');
          } else {
            this.toastr.error('Error creating allocations: ' + (error.error?.message || error.message || 'Unknown error'));
          }
          console.error('Error creating allocations:', error);
        });
      }
    } else if (this.selectedEmployeeAllocations().length === 0) {
      this.toastr.warning('Please select at least one employee for allocation');
    }
  }

  // Handle week start date change to detect multi-month weeks
  onWeekStartDateChange(weekStartDate: string) {
    this.formWeekStartDate.set(weekStartDate);
    this.checkMultiMonthWeek();
    this.refreshWeeklyCapacity();
  }

  // Handle week end date change to detect multi-month weeks
  onWeekEndDateChange(weekEndDate: string) {
    this.checkMultiMonthWeek();
    this.refreshWeeklyCapacity();
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
    
    if (confirm(`Are you sure you want to delete the allocation for ${allocation.userName} on ${allocation.projectName}?`)) {
      this.allocationService.deleteAllocation(allocation.allocationId).subscribe({
        next: () => {
          this.toastr.success('Allocation deleted successfully');
          this.loadInitialData();
        },
        error: (error) => {
          this.toastr.error('Error deleting allocation');
          console.error('Error deleting allocation:', error);
        }
      });
    }
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

    const parts: string[] = [];
    parts.push(`Available: ${capacity.availableHours}h`);
    
    // Show breakdown of what reduced the capacity
    const reductions: string[] = [];
    if (capacity.holidayDays > 0) {
      reductions.push(`${capacity.holidayDays} holiday${capacity.holidayDays > 1 ? 's' : ''}`);
    }
    
    if (capacity.leaveDays > 0) {
      const leaveDaysStr = capacity.leaveDays % 1 === 0 
        ? capacity.leaveDays.toString() 
        : capacity.leaveDays.toFixed(1);
      reductions.push(`${leaveDaysStr} day${capacity.leaveDays > 1 ? 's' : ''} leave`);
    }

    if (reductions.length > 0) {
      parts.push(reductions.join(', '));
    }

    return parts.join(' | ');
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
    
    details.push(`Capacity: ${capacity.capacityHours}h`);
    if (capacity.leaveHours > 0) {
      details.push(`Leave Hours: ${capacity.leaveHours}h`);
    }
    details.push(`Available: ${capacity.availableHours}h`);

    return details.join(' | ');
  }

  getTotalAllocatedHours(): number {
    const selectedUserId = this.selectedUserId();
    const currentWeekStart = this.currentWeekStart();
    
    if (!selectedUserId || !currentWeekStart) {
      return 0;
    }
    
    return this.allocations().filter(allocation => 
      allocation.userId === selectedUserId && 
      allocation.weekStartDate === currentWeekStart
    ).reduce((sum, allocation) => sum + allocation.allocatedHours, 0);
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

  // Get available hours for the selected user (45 hours base capacity)
  getAvailableHours(): number {
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

  // Get utilization percentage for the selected user
  getUtilizationPercentage(): number {
    const baseCapacity = 45; // Base weekly capacity in hours
    const allocatedHours = this.getTotalAllocatedHours();
    
    return Math.round((allocatedHours / baseCapacity) * 100);
  }

  // Project-level summary methods for "By Project" view
  getProjectTotalAllocatedHours(): number {
    const selectedProjectId = this.selectedProjectId();
    const currentWeekStart = this.currentWeekStart();
    
    if (!selectedProjectId || !currentWeekStart) {
      return 0;
    }
    
    return this.allocations().filter(allocation => 
      allocation.projectId === selectedProjectId && 
      allocation.weekStartDate === currentWeekStart
    ).reduce((sum, allocation) => sum + allocation.allocatedHours, 0);
  }

  getProjectEmployeeCount(): number {
    const selectedProjectId = this.selectedProjectId();
    const currentWeekStart = this.currentWeekStart();
    
    if (!selectedProjectId || !currentWeekStart) {
      return 0;
    }
    
    const uniqueEmployees = new Set(
      this.allocations().filter(allocation => 
        allocation.projectId === selectedProjectId && 
        allocation.weekStartDate === currentWeekStart
      ).map(allocation => allocation.userId)
    );
    
    return uniqueEmployees.size;
  }

  getProjectAverageUtilization(): number {
    const selectedProjectId = this.selectedProjectId();
    const currentWeekStart = this.currentWeekStart();
    
    if (!selectedProjectId || !currentWeekStart) {
      return 0;
    }
    
    const projectAllocations = this.allocations().filter(allocation => 
      allocation.projectId === selectedProjectId && 
      allocation.weekStartDate === currentWeekStart
    );
    
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
    // All authenticated users can create/edit allocations
    // Backend will enforce proper restrictions
    return true;
  }

  canView(): boolean {
    return true; // All authenticated users can view (backend filters data)
  }

  isReadOnlyUser(): boolean {
    return false; // No longer needed since everyone can create/edit their own allocations
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
}
