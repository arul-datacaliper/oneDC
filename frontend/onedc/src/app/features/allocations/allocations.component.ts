import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { AllocationService, WeeklyAllocation, CreateAllocationRequest, AllocationSummary, EmployeeAllocationSummary } from '../../core/services/allocation.service';
import { ProjectsService } from '../../core/services/projects.service';
import { UserManagementService, AppUser } from '../../core/services/user-management.service';
import { Project } from '../../shared/models';

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
      endDate.setDate(startDate.getDate() + 6);
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
      endDate.setDate(startDate.getDate() + 6);
      return endDate.toISOString().split('T')[0];
    }
    return '';
  }  constructor() {
    // Form validation with realistic work hour limits
    // Business Rules:
    // - Standard work week: 45 hours (9 hours/day × 5 working days)
    // - Maximum allowed: 67.5 hours (150% utilization, includes reasonable overtime)
    // - Minimum: 1 hour (for partial allocations)
    this.allocationForm = this.fb.group({
      projectId: ['', Validators.required],
      userId: ['', Validators.required],
      allocatedHours: [45, [Validators.required, Validators.min(1), Validators.max(67.5)]],
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
      error: (error) => console.error('Error loading allocations:', error)
    });
  }

  private loadProjectSummary() {
    return this.allocationService.getProjectAllocationSummary(this.currentWeekStart()).subscribe({
      next: (summary) => this.projectSummary.set(summary),
      error: (error) => console.error('Error loading project summary:', error)
    });
  }

  private loadEmployeeSummary() {
    return this.allocationService.getEmployeeAllocationSummary(this.currentWeekStart()).subscribe({
      next: (summary) => this.employeeSummary.set(summary),
      error: (error) => console.error('Error loading employee summary:', error)
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
      next: (employees) => this.availableEmployees.set(employees),
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
    this.allocationForm.reset();
    this.allocationForm.patchValue({
      allocatedHours: 45,
      weekStartDate: this.currentWeekStart()
    });
    this.editingAllocation.set(null);
    this.showCreateModal.set(true);
  }

  openEditModal(allocation: WeeklyAllocation) {
    this.allocationForm.patchValue({
      projectId: allocation.projectId,
      userId: allocation.userId,
      allocatedHours: allocation.allocatedHours,
      weekStartDate: allocation.weekStartDate
    });
    this.editingAllocation.set(allocation);
    this.showCreateModal.set(true);
  }

  closeModal() {
    this.showCreateModal.set(false);
    this.editingAllocation.set(null);
    this.allocationForm.reset();
  }

  onSubmit() {
    if (this.allocationForm.valid) {
      const formValue = this.allocationForm.value;
      
      if (this.editingAllocation()) {
        // Update existing allocation
        const updateRequest = {
          allocatedHours: formValue.allocatedHours
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
        // Create new allocation
        const createRequest: CreateAllocationRequest = {
          projectId: formValue.projectId,
          userId: formValue.userId,
          weekStartDate: formValue.weekStartDate,
          allocatedHours: formValue.allocatedHours
        };

        this.allocationService.createAllocation(createRequest).subscribe({
          next: () => {
            this.toastr.success('Allocation created successfully');
            this.closeModal();
            this.loadInitialData();
          },
          error: (error) => {
            if (error.status === 409) {
              this.toastr.error('Allocation already exists for this project, user, and week. Please choose a different week or update the existing allocation.');
            } else {
              this.toastr.error('Error creating allocation: ' + (error.error?.message || error.message || 'Unknown error'));
            }
            console.error('Error creating allocation:', error);
          }
        });
      }
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
}
