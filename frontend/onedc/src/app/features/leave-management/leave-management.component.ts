import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LeaveService, LeaveRequest, LeaveRequestCreate } from '../../core/services/leave.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-leave-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './leave-management.component.html',
  styleUrls: ['./leave-management.component.scss']
})
export class LeaveManagementComponent implements OnInit {
  // Signals for reactive state
  myLeaveRequests = signal<LeaveRequest[]>([]);
  pendingApprovals = signal<LeaveRequest[]>([]);
  leaveTypes = signal<string[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  
  // Admin employee records
  employees = signal<any[]>([]);
  selectedEmployeeId = signal<string | null>(null);
  employeeLeaveRequests = signal<LeaveRequest[]>([]);
  
  // UI state
  activeTab = signal<'my-leaves' | 'apply-leave' | 'approvals' | 'employee-records'>('my-leaves');
  showLeaveForm = signal(false);
  editingLeave = signal<LeaveRequest | null>(null);

  // Form
  leaveForm: FormGroup;

  // User role checks
  isApprover = computed(() => this.authService.isApprover());
  isAdmin = computed(() => this.authService.isAdmin());
  currentUser = computed(() => this.authService.getCurrentUser());

  constructor(
    private leaveService: LeaveService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.leaveForm = this.fb.group({
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      leaveType: ['', [Validators.required]],
      reason: ['', [Validators.required]],
      isHalfDay: [false],
      halfDayPeriod: ['']
    });

    // Watch for half day changes
    this.leaveForm.get('isHalfDay')?.valueChanges.subscribe(isHalfDay => {
      const halfDayPeriodControl = this.leaveForm.get('halfDayPeriod');
      if (isHalfDay) {
        halfDayPeriodControl?.setValidators([Validators.required]);
        // Set end date same as start date for half day
        const startDate = this.leaveForm.get('startDate')?.value;
        if (startDate) {
          this.leaveForm.get('endDate')?.setValue(startDate);
        }
      } else {
        halfDayPeriodControl?.clearValidators();
        halfDayPeriodControl?.setValue('');
      }
      halfDayPeriodControl?.updateValueAndValidity();
    });

    // Watch for start date changes when half day is selected
    this.leaveForm.get('startDate')?.valueChanges.subscribe(startDate => {
      if (this.leaveForm.get('isHalfDay')?.value && startDate) {
        this.leaveForm.get('endDate')?.setValue(startDate);
      }
    });
  }

  ngOnInit() {
    this.loadInitialData();
  }

  async loadInitialData() {
    this.isLoading.set(true);
    console.log('LeaveManagement: Starting to load initial data...');
    
    try {
      // Load data sequentially to better handle errors
      await this.loadMyLeaveRequests();
      await this.loadLeaveTypes();

      // Load approvals if user is approver or admin
      if (this.isApprover() || this.isAdmin()) {
        console.log('LeaveManagement: User is approver/admin, loading pending approvals...');
        await this.loadPendingApprovals();
      }
      
      console.log('LeaveManagement: All data loaded successfully');
    } catch (error) {
      console.error('LeaveManagement: Error loading leave data:', error);
      this.error.set('Failed to load leave data');
    } finally {
      this.isLoading.set(false);
      console.log('LeaveManagement: Loading finished, isLoading set to false');
    }
  }

  async loadMyLeaveRequests() {
    try {
      console.log('LeaveManagement: Loading my leave requests...');
      const response = await this.leaveService.getMyLeaveRequests().toPromise();
      if (response.success) {
        this.myLeaveRequests.set(response.data);
        console.log('LeaveManagement: My leave requests loaded:', response.data);
      }
    } catch (error) {
      console.error('LeaveManagement: Error loading my leave requests:', error);
    }
  }

  async loadPendingApprovals() {
    try {
      console.log('LeaveManagement: Loading pending approvals...');
      const response = await this.leaveService.getPendingLeaveRequests().toPromise();
      if (response.success) {
        this.pendingApprovals.set(response.data);
        console.log('LeaveManagement: Pending approvals loaded:', response.data);
      }
    } catch (error) {
      console.error('LeaveManagement: Error loading pending approvals:', error);
    }
  }

  async loadLeaveTypes() {
    try {
      console.log('LeaveManagement: Loading leave types...');
      const response = await this.leaveService.getLeaveTypes().toPromise();
      if (response.success) {
        this.leaveTypes.set(response.data);
        console.log('LeaveManagement: Leave types loaded:', response.data);
      }
    } catch (error) {
      console.error('LeaveManagement: Error loading leave types:', error);
      // Fallback to default leave types if API fails
      this.leaveTypes.set(['Annual', 'Sick', 'Personal', 'Emergency', 'Maternity', 'Paternity', 'Bereavement']);
    }
  }

  async loadEmployeeList() {
    try {
      console.log('LeaveManagement: Loading employee list...');
      const response = await this.leaveService.getAllEmployees().toPromise();
      if (response.success) {
        this.employees.set(response.data);
        console.log('LeaveManagement: Employee list loaded:', response.data);
      }
    } catch (error) {
      console.error('LeaveManagement: Error loading employee list:', error);
      // Fallback to mock data if API fails
      this.employees.set([
        { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Employee' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Approver' },
        { id: '3', name: 'Mike Johnson', email: 'mike@example.com', role: 'Employee' }
      ]);
    }
  }

  async loadEmployeeLeaveRequests(employeeId: string) {
    try {
      console.log('LeaveManagement: Loading leave requests for employee:', employeeId);
      const response = await this.leaveService.getEmployeeLeaveRequests(employeeId).toPromise();
      if (response.success) {
        this.employeeLeaveRequests.set(response.data);
        console.log('LeaveManagement: Employee leave requests loaded:', response.data);
      }
    } catch (error) {
      console.error('LeaveManagement: Error loading employee leave requests:', error);
      this.employeeLeaveRequests.set([]);
    }
  }

  onEmployeeSelect(employeeId: string) {
    this.selectedEmployeeId.set(employeeId);
    if (employeeId) {
      this.loadEmployeeLeaveRequests(employeeId);
    } else {
      this.employeeLeaveRequests.set([]);
    }
  }

  setActiveTab(tab: 'my-leaves' | 'apply-leave' | 'approvals' | 'employee-records') {
    this.activeTab.set(tab);
    if (tab === 'apply-leave') {
      this.showLeaveForm.set(true);
      // Only reset form if we're not editing an existing leave request
      if (!this.editingLeave()) {
        this.resetForm();
      }
    } else {
      this.showLeaveForm.set(false);
      // Clear editing state when navigating away from apply-leave tab
      if (this.editingLeave()) {
        this.editingLeave.set(null);
        this.resetForm();
      }
    }

    // Load employee list when accessing employee records tab
    if (tab === 'employee-records' && this.isAdmin()) {
      this.loadEmployeeList();
    }
  }

  editLeaveRequest(leave: LeaveRequest) {
    this.editingLeave.set(leave);
    
    // Set the active tab first
    this.activeTab.set('apply-leave');
    this.showLeaveForm.set(true);
    
    // Format dates properly for input fields
    const startDate = leave.startDate ? new Date(leave.startDate).toISOString().split('T')[0] : '';
    const endDate = leave.endDate ? new Date(leave.endDate).toISOString().split('T')[0] : '';
    
    // Populate form with leave data
    this.leaveForm.patchValue({
      startDate: startDate,
      endDate: endDate,
      leaveType: leave.leaveType || '',
      reason: leave.reason || '',
      isHalfDay: leave.isHalfDay || false,
      halfDayPeriod: leave.halfDayPeriod || ''
    });
    
    console.log('Editing leave request:', leave);
    console.log('Form values after patch:', this.leaveForm.value);
  }

  resetForm() {
    this.leaveForm.reset({
      startDate: '',
      endDate: '',
      leaveType: '',
      reason: '',
      isHalfDay: false,
      halfDayPeriod: ''
    });
  }

  async submitLeaveRequest() {
    if (this.leaveForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const formValue = this.leaveForm.value;
      const request: LeaveRequestCreate = {
        startDate: formValue.startDate,
        endDate: formValue.endDate,
        leaveType: formValue.leaveType,
        reason: formValue.reason,
        isHalfDay: formValue.isHalfDay,
        halfDayPeriod: formValue.halfDayPeriod
      };

      let response;
      if (this.editingLeave()) {
        response = await this.leaveService.updateLeaveRequest(this.editingLeave()!.id, {
          id: this.editingLeave()!.id,
          ...request
        }).toPromise();
      } else {
        response = await this.leaveService.createLeaveRequest(request).toPromise();
      }

      if (response.success) {
        this.showLeaveForm.set(false);
        this.editingLeave.set(null);
        this.resetForm();
        await this.loadMyLeaveRequests();
        this.setActiveTab('my-leaves');
      } else {
        this.error.set(response.message || 'Failed to submit leave request');
      }
    } catch (error: any) {
      this.error.set(error.error?.message || 'Failed to submit leave request');
      console.error('Error submitting leave request:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteLeaveRequest(leave: LeaveRequest) {
    if (!confirm('Are you sure you want to delete this leave request?')) {
      return;
    }

    this.isLoading.set(true);
    try {
      const response = await this.leaveService.deleteLeaveRequest(leave.id).toPromise();
      if (response.success) {
        await this.loadMyLeaveRequests();
      } else {
        this.error.set(response.message || 'Failed to delete leave request');
      }
    } catch (error: any) {
      this.error.set(error.error?.message || 'Failed to delete leave request');
      console.error('Error deleting leave request:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async approveLeave(leave: LeaveRequest, comments?: string) {
    await this.processApproval(leave, 'Approved', comments);
  }

  async rejectLeave(leave: LeaveRequest, comments?: string) {
    await this.processApproval(leave, 'Rejected', comments);
  }

  private async processApproval(leave: LeaveRequest, status: 'Approved' | 'Rejected', comments?: string) {
    this.isLoading.set(true);
    try {
      const response = await this.leaveService.approveOrRejectLeave(leave.id, {
        status,
        approverComments: comments
      }).toPromise();

      if (response.success) {
        await this.loadPendingApprovals();
      } else {
        this.error.set(response.message || `Failed to ${status.toLowerCase()} leave request`);
      }
    } catch (error: any) {
      this.error.set(error.error?.message || `Failed to ${status.toLowerCase()} leave request`);
      console.error(`Error ${status.toLowerCase()} leave request:`, error);
    } finally {
      this.isLoading.set(false);
    }
  }

  cancelForm() {
    this.editingLeave.set(null);
    this.resetForm();
    this.setActiveTab('my-leaves');
  }

  private markFormGroupTouched() {
    Object.keys(this.leaveForm.controls).forEach(key => {
      const control = this.leaveForm.get(key);
      control?.markAsTouched();
    });
  }

  // Helper methods for template
  getStatusBadgeClass(status: string): string {
    return this.leaveService.getStatusBadgeClass(status);
  }

  getLeaveTypeBadgeClass(leaveType: string): string {
    return this.leaveService.getLeaveTypeBadgeClass(leaveType);
  }

  formatDateRange(startDate: string, endDate: string): string {
    return this.leaveService.formatDateRange(startDate, endDate);
  }

  canEdit(leave: LeaveRequest): boolean {
    // Cannot edit if the leave is approved
    if (leave.status === 'Approved') {
      return false;
    }
    
    // Use the service's canEdit logic for other conditions
    return this.leaveService.canEdit(leave);
  }

  canDelete(leave: LeaveRequest): boolean {
    // Cannot delete if the leave is approved
    if (leave.status === 'Approved') {
      return false;
    }
    
    // Use the service's canDelete logic for other conditions
    return this.leaveService.canDelete(leave);
  }

  isUpcoming(startDate: string): boolean {
    return this.leaveService.isUpcoming(startDate);
  }

  isPast(endDate: string): boolean {
    return this.leaveService.isPast(endDate);
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  getFormError(fieldName: string): string | null {
    const field = this.leaveForm.get(fieldName);
    if (field?.errors && field?.touched) {
      if (field.errors['required']) {
        return `${this.getFieldDisplayName(fieldName)} is required`;
      }
    }
    return null;
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      startDate: 'Start Date',
      endDate: 'End Date',
      leaveType: 'Leave Type',
      reason: 'Reason',
      halfDayPeriod: 'Half Day Period'
    };
    return displayNames[fieldName] || fieldName;
  }
}
