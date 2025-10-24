import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LeaveService, LeaveRequest, LeaveRequestCreate, LeaveBalance } from '../../core/services/leave.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmationDialogService } from '../../core/services/confirmation-dialog.service';
import { HolidayService, Holiday } from '../../core/services/holiday.service';

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
  leaveBalance = signal<LeaveBalance | null>(null);
  
  // Admin employee records
  employees = signal<any[]>([]);
  selectedEmployeeId = signal<string | null>(null);
  employeeLeaveRequests = signal<LeaveRequest[]>([]);
  
  // Holidays
  holidays = signal<Holiday[]>([]);
  
  // UI state
  activeTab = signal<'my-leaves' | 'apply-leave' | 'approvals' | 'employee-records' | 'holidays'>('my-leaves');
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
    private fb: FormBuilder,
    private confirmationDialogService: ConfirmationDialogService,
    private holidayService: HolidayService
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
      // Validate balance when dates change
      this.validateFormBalance();
    });

    // Watch for end date changes to validate balance
    this.leaveForm.get('endDate')?.valueChanges.subscribe(() => {
      this.validateFormBalance();
    });

    // Watch for half day changes to validate balance
    this.leaveForm.get('isHalfDay')?.valueChanges.subscribe(() => {
      this.validateFormBalance();
    });
  }

  private validateFormBalance() {
    // This method now only triggers UI updates but doesn't make form invalid
    // The warning will be shown in the UI but form remains submittable
    const startDate = this.leaveForm.get('startDate')?.value;
    const endDate = this.leaveForm.get('endDate')?.value;
    const balance = this.leaveBalance();
    
    // We keep this method for potential future use or UI updates
    // but we don't set form errors anymore
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
      await this.loadLeaveBalance();
      await this.loadHolidays();

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

  async loadLeaveBalance() {
    try {
      console.log('LeaveManagement: Loading leave balance...');
      const response = await this.leaveService.getLeaveBalance().toPromise();
      if (response.success) {
        this.leaveBalance.set(response.data);
        console.log('LeaveManagement: Leave balance loaded:', response.data);
        console.log('Years of service:', response.data.yearsOfService);
        console.log('Total entitlement:', response.data.totalEntitlement);
        console.log('Joining date:', response.data.joiningDate);
        
        // Trigger form validation after balance is loaded
        this.validateFormBalance();
      }
    } catch (error) {
      console.error('LeaveManagement: Error loading leave balance:', error);
      // Calculate leave balance locally if API fails
      this.calculateLeaveBalanceLocally();
    }
  }

  async loadHolidays() {
    try {
      console.log('LeaveManagement: Loading holidays...');
      const holidays = await this.holidayService.getCurrentYearHolidays().toPromise();
      this.holidays.set(holidays || []);
      console.log('LeaveManagement: Holidays loaded:', holidays);
    } catch (error) {
      console.error('LeaveManagement: Error loading holidays:', error);
      this.holidays.set([]);
    }
  }

  private calculateLeaveBalanceLocally() {
    const currentUser = this.currentUser();
    if (!currentUser) {
      return;
    }

    // For now, since joiningDate is not available in AuthResult, 
    // we'll set a default entitlement and let the backend handle the real calculation
    const currentYear = new Date().getFullYear();
    const defaultEntitlement = 25; // Default to max entitlement, backend will correct this
    const usedDays = this.leaveService.calculateUsedLeaveDays(this.myLeaveRequests(), currentYear);
    const pendingDays = this.leaveService.calculatePendingLeaveDays(this.myLeaveRequests(), currentYear);

    const balance: LeaveBalance = {
      totalEntitlement: defaultEntitlement,
      usedDays: usedDays - pendingDays, // Exclude pending from used
      pendingDays,
      remainingDays: defaultEntitlement - usedDays,
      joiningDate: '', // Will be populated by backend
      yearsOfService: 0, // Will be calculated by backend
      currentYear
    };

    this.leaveBalance.set(balance);
    console.log('LeaveManagement: Leave balance calculated locally (default):', balance);
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

  setActiveTab(tab: 'my-leaves' | 'apply-leave' | 'approvals' | 'employee-records' | 'holidays') {
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

    // Reload holidays when accessing holidays tab
    if (tab === 'holidays') {
      this.loadHolidays();
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

    // Show warning but don't block submission if balance is exceeded
    const balance = this.leaveBalance();
    if (balance && this.isRequestExceedingBalance()) {
      const requestedDays = this.calculateRequestedDays();
      const confirmed = await this.confirmationDialogService.confirmLeaveRequest(
        requestedDays,
        balance.remainingDays
      );
      
      if (!confirmed) {
        return;
      }
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
        await this.loadLeaveBalance(); // Refresh balance after submission
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
    const confirmed = await this.confirmationDialogService.confirmDelete('leave request');
    if (!confirmed) {
      return;
    }

    this.isLoading.set(true);
    try {
      const response = await this.leaveService.deleteLeaveRequest(leave.id).toPromise();
      if (response.success) {
        await this.loadMyLeaveRequests();
        await this.loadLeaveBalance(); // Refresh balance after deletion
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

  getCurrentYear(): number {
    return new Date().getFullYear();
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
    return displayNames[fieldName] || this.capitalizeFirstLetter(fieldName);
  }

  private capitalizeFirstLetter(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Helper methods for leave balance display
  getLeaveBalanceInfo(): string {
    const balance = this.leaveBalance();
    if (!balance) {
      return 'Loading leave balance...';
    }

    const eligibilityText = balance.yearsOfService >= 1 
      ? `${balance.totalEntitlement} days (${balance.yearsOfService}+ years of service)`
      : `${balance.totalEntitlement} days (less than 1 year of service)`;

    return `Annual Entitlement: ${eligibilityText}`;
  }

  getLeaveBalanceClass(): string {
    const balance = this.leaveBalance();
    if (!balance) return 'text-muted';
    
    const percentage = (balance.remainingDays / balance.totalEntitlement) * 100;
    if (percentage <= 20) return 'text-danger';
    if (percentage <= 50) return 'text-warning';
    return 'text-success';
  }

  calculateRequestedDays(): number {
    const formValue = this.leaveForm.value;
    if (!formValue.startDate || !formValue.endDate) {
      return 0;
    }

    if (formValue.isHalfDay) {
      return 0.5;
    }

    return this.leaveService.calculateDaysBetween(formValue.startDate, formValue.endDate);
  }

  getRequestedDaysText(): string {
    const days = this.calculateRequestedDays();
    if (days === 0) return '';
    if (days === 0.5) return '0.5 day';
    if (days === 1) return '1 day';
    return `${days} days`;
  }

  isRequestExceedingBalance(): boolean {
    const balance = this.leaveBalance();
    if (!balance) return false;
    
    const requestedDays = this.calculateRequestedDays();
    return requestedDays > balance.remainingDays;
  }

  // Holiday helper methods
  formatHolidayDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      return dateString;
    }
  }

  getMonthName(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'long' });
    } catch (error) {
      return '';
    }
  }

  groupHolidaysByMonth(): { month: string; holidays: Holiday[] }[] {
    const holidayList = this.holidays();
    const grouped = new Map<string, Holiday[]>();

    holidayList.forEach(holiday => {
      const month = this.getMonthName(holiday.holidayDate);
      if (!grouped.has(month)) {
        grouped.set(month, []);
      }
      grouped.get(month)!.push(holiday);
    });

    return Array.from(grouped.entries()).map(([month, holidays]) => ({
      month,
      holidays: holidays.sort((a, b) => 
        new Date(a.holidayDate).getTime() - new Date(b.holidayDate).getTime()
      )
    }));
  }
}
