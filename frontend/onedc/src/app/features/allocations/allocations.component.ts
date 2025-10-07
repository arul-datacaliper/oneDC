import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { AllocationService, WeeklyAllocation, CreateAllocationRequest, AllocationSummary, EmployeeAllocationSummary } from '../../core/services/allocation.service';
import { ProjectsService } from '../../core/services/projects.service';
import { UserManagementService, AppUser } from '../../core/services/user-management.service';
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
  
  // Computed properties
  availableProjectsWithDisplayName = computed(() => {
    return this.availableProjects().map(project => ({
      ...project,
      displayName: `${project.projectName} - ${project.clientName}`
    }));
  });
  
  // UI state signals
  isLoading = signal(false);
  showCreateModal = signal(false);
  editingAllocation = signal<WeeklyAllocation | null>(null);
  selectedEmployeeAllocations = signal<EmployeeAllocation[]>([]);
  availableEmployeesForSelection = signal<{userId: string, userName: string, role: string}[]>([]);
  selectedEmployeeForDropdown = signal<string | null>(null);
  
  // Multi-month allocation signals
  isMultiMonthWeek = signal<boolean>(false);
  monthPeriods = signal<MonthPeriodAllocation[]>([]);
  
  // Export functionality
  exportFromDate = signal<string>('');
  exportToDate = signal<string>('');
  isExporting = signal<boolean>(false);
  selectedExportPeriod = signal<'prev-month' | 'this-month' | 'this-quarter' | 'custom'>('this-month');

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

  // Computed property for selected week end date
  selectedWeekEndDate = computed(() => {
    const weekStartDate = this.formWeekStartDate();
    if (weekStartDate) {
      // Parse the date string directly without timezone conversion
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
    return '';
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
      weekStartDate: ['', Validators.required]
    });

    // Track form weekStartDate changes and update signal
    this.allocationForm.get('weekStartDate')?.valueChanges.subscribe(value => {
      this.formWeekStartDate.set(value || '');
    });

    // Initialize with current week
    const today = new Date();
    this.currentWeekStart.set(this.allocationService.getWeekStartDate(today));
    
    // Initialize export dates with current month
    this.setCurrentMonth();
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

  onWeekChange(direction: 'prev' | 'next') {
    const currentDate = new Date(this.currentWeekStart());
    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 7);
    } else {
      currentDate.setDate(currentDate.getDate() + 7);
    }
    this.currentWeekStart.set(this.allocationService.getWeekStartDate(currentDate));
    this.loadInitialData();
  }

  onWeekDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const selectedDate = new Date(input.value + 'T00:00:00'); // Add time to avoid timezone issues
    if (!isNaN(selectedDate.getTime())) {
      this.currentWeekStart.set(this.allocationService.getWeekStartDate(selectedDate));
      this.loadInitialData();
    }
  }

  onViewModeChange(mode: 'overview' | 'project' | 'employee') {
    this.viewMode.set(mode);
    this.selectedProjectId.set('');
    this.selectedUserId.set('');
  }

  onProjectSelect(projectId: string) {
    this.selectedProjectId.set(projectId);
    this.viewMode.set('project');
  }

  onEmployeeSelect(userId: string) {
    this.selectedUserId.set(userId);
    this.viewMode.set('employee');
  }

  openCreateModal() {
    console.log('openCreateModal called');
    this.allocationForm.reset();
    const currentWeek = this.currentWeekStart();
    this.allocationForm.patchValue({
      weekStartDate: currentWeek
    });
    this.formWeekStartDate.set(currentWeek); // Update signal manually for initial value
    this.selectedEmployeeAllocations.set([]);
    this.selectedEmployeeForDropdown.set(null);
    this.updateAvailableEmployeesForSelection();
    this.editingAllocation.set(null);
    this.showCreateModal.set(true);
    console.log('Modal opened - availableEmployees:', this.availableEmployees());
    console.log('Modal opened - availableEmployeesForSelection:', this.availableEmployeesForSelection());
  }

  openEditModal(allocation: WeeklyAllocation) {
    this.allocationForm.patchValue({
      projectId: allocation.projectId,
      weekStartDate: allocation.weekStartDate
    });
    this.formWeekStartDate.set(allocation.weekStartDate); // Update signal manually
    // For edit mode, set single employee allocation
    this.selectedEmployeeAllocations.set([{
      userId: allocation.userId,
      userName: allocation.userName,
      allocatedHours: allocation.allocatedHours
    }]);
    this.updateAvailableEmployeesForSelection();
    this.editingAllocation.set(allocation);
    this.showCreateModal.set(true);
  }

  closeModal() {
    this.showCreateModal.set(false);
    this.editingAllocation.set(null);
    this.selectedEmployeeAllocations.set([]);
    this.formWeekStartDate.set(''); // Clear the signal
    this.allocationForm.reset();
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
            weekEndDate: this.selectedWeekEndDate(),
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
    
    if (weekStartDate) {
      const isMultiMonth = this.allocationService.isWeekSpanningMultipleMonths(weekStartDate);
      this.isMultiMonthWeek.set(isMultiMonth);
      
      if (isMultiMonth) {
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

  getTotalAllocatedHours(): number {
    return this.allocations().reduce((sum, allocation) => sum + allocation.allocatedHours, 0);
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
}
