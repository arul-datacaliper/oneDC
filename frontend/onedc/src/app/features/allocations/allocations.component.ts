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

  // Signals for reactive state management
  currentWeekStart = signal<string>('');
  viewMode = signal<'overview' | 'project' | 'employee'>('overview');
  selectedProjectId = signal<string>('');
  selectedUserId = signal<string>('');
  
  // Data signals
  allocations = signal<WeeklyAllocation[]>([]);
  projectSummary = signal<AllocationSummary[]>([]);
  employeeSummary = signal<EmployeeAllocationSummary[]>([]);
  availableProjects = signal<{projectId: string, projectName: string, status: string}[]>([]);
  availableEmployees = signal<{userId: string, userName: string, role: string}[]>([]);
  
  // UI state signals
  isLoading = signal(false);
  showCreateModal = signal(false);
  editingAllocation = signal<WeeklyAllocation | null>(null);
  selectedEmployeeAllocations = signal<EmployeeAllocation[]>([]);
  availableEmployeesForSelection = signal<{userId: string, userName: string, role: string}[]>([]);
  selectedEmployeeForDropdown = signal<string | null>(null);

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
    const weekStartDate = this.allocationForm?.get('weekStartDate')?.value;
    if (weekStartDate) {
      const startDate = new Date(weekStartDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6); // Sunday + 6 = Saturday
      return endDate.toISOString().split('T')[0];
    }
    return '';
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
      return new Date(weekStart).toISOString().split('T')[0];
    }
    return '';
  }

  // Format current week end for display
  formatCurrentWeekEnd(): string {
    const weekStart = this.currentWeekStart();
    if (weekStart) {
      const startDate = new Date(weekStart);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6); // Sunday + 6 = Saturday
      return endDate.toISOString().split('T')[0];
    }
    return '';
  }  constructor() {
    // Form validation for multiple employee allocation
    this.allocationForm = this.fb.group({
      projectId: ['', Validators.required],
      weekStartDate: ['', Validators.required]
    });

    // Initialize with current week
    const today = new Date();
    this.currentWeekStart.set(this.allocationService.getWeekStartDate(today));
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
    const selectedDate = new Date(input.value);
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
    this.allocationForm.patchValue({
      weekStartDate: this.currentWeekStart()
    });
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
        const createRequests: CreateAllocationRequest[] = this.selectedEmployeeAllocations().map(emp => ({
          projectId: formValue.projectId,
          userId: emp.userId,
          weekStartDate: formValue.weekStartDate,
          allocatedHours: emp.allocatedHours
        }));

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

        Promise.all(allocationPromises).then(() => {
          this.toastr.success(`${createRequests.length} allocation(s) created successfully`);
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

  // TrackBy function for employee list
  trackByUserId(index: number, employee: EmployeeAllocation): string {
    return employee.userId;
  }
}
