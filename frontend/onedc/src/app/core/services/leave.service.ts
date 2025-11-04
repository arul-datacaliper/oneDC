import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LeaveRequest {
  id: number;
  employeeId: string;
  employeeName?: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason?: string;
  status: string;
  totalDays: number;
  isHalfDay: boolean;
  halfDayPeriod?: string;
  approverName?: string;
  approverComments?: string;
  approvedDate?: string;
  createdDate: string;
  modifiedDate?: string;
}

export interface LeaveRequestCreate {
  startDate: string;
  endDate: string;
  leaveType: string;
  reason?: string;
  isHalfDay: boolean;
  halfDayPeriod?: string;
}

export interface LeaveRequestUpdate extends LeaveRequestCreate {
  id: number;
}

export interface LeaveApproval {
  status: 'Approved' | 'Rejected';
  approverComments?: string;
}

export interface LeaveStatistics {
  totalLeaves: number;
  approvedLeaves: number;
  pendingLeaves: number;
  rejectedLeaves: number;
  totalDaysUsed: number;
  remainingDays: number;
  leaveTypeBreakdown: { [key: string]: number };
}

export interface LeaveBalance {
  totalEntitlement: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  joiningDate: string;
  yearsOfService: number;
  currentYear: number;
}

@Injectable({
  providedIn: 'root'
})
export class LeaveService {
  private apiUrl = `${environment.apiBaseUrl}/leaves`;
  private leaveRequestsSubject = new BehaviorSubject<LeaveRequest[]>([]);
  public leaveRequests$ = this.leaveRequestsSubject.asObservable();

  // Signals for reactive state management
  public isLoading = signal(false);
  public error = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  // Employee operations
  createLeaveRequest(request: LeaveRequestCreate): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.post(`${this.apiUrl}`, request);
  }

  getMyLeaveRequests(): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.get(`${this.apiUrl}/my-requests`);
  }

  updateLeaveRequest(id: number, request: LeaveRequestUpdate): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.put(`${this.apiUrl}/${id}`, request);
  }

  deleteLeaveRequest(id: number): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getLeaveStatistics(year?: number): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    let params: Record<string, string> = {};
    if (year) {
      params['year'] = year.toString();
    }
    return this.http.get(`${this.apiUrl}/statistics`, { params });
  }

  // Approver operations
  getPendingLeaveRequests(): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.get(`${this.apiUrl}/pending`);
  }

  approveOrRejectLeave(id: number, approval: LeaveApproval): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.post(`${this.apiUrl}/${id}/approval`, approval);
  }

  getMyApprovals(): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.get(`${this.apiUrl}/my-approvals`);
  }

  // Admin operations
  getAllEmployees(): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.get(`${this.apiUrl}/employees`);
  }

  getEmployeeLeaveRequests(employeeId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.get(`${this.apiUrl}/admin/employee/${employeeId}`);
  }

  // Admin operations
  getAllLeaveRequests(): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.get(`${this.apiUrl}/all`);
  }

  getLeaveRequestsByEmployee(employeeId: string): Observable<any> {
    this.isLoading.set(true);
    this.error.set(null);
    return this.http.get(`${this.apiUrl}/employee/${employeeId}`);
  }

  // Utility operations
  getLeaveTypes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/types`);
  }

  getRemainingLeaveDays(year?: number): Observable<any> {
    let params: Record<string, string> = {};
    if (year) {
      params['year'] = year.toString();
    }
    return this.http.get(`${this.apiUrl}/remaining-days`, { params });
  }

  getLeaveBalance(year?: number): Observable<any> {
    let params: Record<string, string> = {};
    if (year) {
      params['year'] = year.toString();
    }
    return this.http.get(`${this.apiUrl}/balance`, { params });
  }

  getUpcomingLeaves(days: number = 30): Observable<any> {
    return this.http.get(`${this.apiUrl}/upcoming`, { params: { days: days.toString() } });
  }

  // Helper methods
  setLoading(loading: boolean) {
    this.isLoading.set(loading);
  }

  setError(error: string | null) {
    this.error.set(error);
  }

  updateLeaveRequestsCache(requests: LeaveRequest[]) {
    this.leaveRequestsSubject.next(requests);
  }

  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'badge bg-success';
      case 'rejected':
        return 'badge bg-danger';
      case 'pending':
        return 'badge bg-warning text-dark';
      default:
        return 'badge bg-secondary';
    }
  }

  getLeaveTypeBadgeClass(leaveType: string): string {
    switch (leaveType?.toLowerCase()) {
      case 'annual':
        return 'badge bg-primary';
      case 'sick':
        return 'badge bg-info';
      case 'personal':
        return 'badge bg-secondary';
      case 'emergency':
        return 'badge bg-danger';
      case 'maternity':
      case 'paternity':
        return 'badge bg-success';
      case 'bereavement':
        return 'badge bg-dark';
      default:
        return 'badge bg-light text-dark';
    }
  }

  formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString();
    }
    
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }

  calculateDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  isUpcoming(startDate: string): boolean {
    const start = new Date(startDate);
    const today = new Date();
    return start > today;
  }

  isPast(endDate: string): boolean {
    const end = new Date(endDate);
    const today = new Date();
    return end < today;
  }

  canEdit(leaveRequest: LeaveRequest): boolean {
    // Can edit if pending and the leave hasn't started yet (using current date, not future-only)
    const leaveStart = new Date(leaveRequest.startDate);
    leaveStart.setHours(0, 0, 0, 0); // Set to start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day
    
    return leaveRequest.status === 'Pending' && leaveStart >= today;
  }

  canDelete(leaveRequest: LeaveRequest): boolean {
    // Can delete if pending and the leave hasn't started yet (using current date, not future-only)
    const leaveStart = new Date(leaveRequest.startDate);
    leaveStart.setHours(0, 0, 0, 0); // Set to start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day
    
    return leaveRequest.status === 'Pending' && leaveStart >= today;
  }

  // Leave entitlement calculations
  calculateLeaveEntitlement(joiningDate: string): number {
    const joining = new Date(joiningDate);
    const now = new Date();
    const yearsOfService = this.calculateYearsOfService(joiningDate);
    
    // More than 1 year of service gets 25 days, less than 1 year gets 15 days
    return yearsOfService >= 1 ? 25 : 15;
  }

  calculateYearsOfService(joiningDate: string): number {
    const joining = new Date(joiningDate);
    const today = new Date();
    
    // Calculate the difference in years
    let years = today.getFullYear() - joining.getFullYear();
    
    // If the anniversary hasn't occurred this year, subtract 1
    const anniversaryThisYear = new Date(today.getFullYear(), joining.getMonth(), joining.getDate());
    if (today < anniversaryThisYear) {
      years--;
    }
    
    return Math.max(0, years);
  }

  calculateUsedLeaveDays(leaveRequests: LeaveRequest[], year?: number): number {
    const currentYear = year || new Date().getFullYear();
    
    return leaveRequests
      .filter(leave => {
        const leaveYear = new Date(leave.startDate).getFullYear();
        return leaveYear === currentYear && (leave.status === 'Approved' || leave.status === 'Pending');
      })
      .reduce((total, leave) => total + leave.totalDays, 0);
  }

  calculatePendingLeaveDays(leaveRequests: LeaveRequest[], year?: number): number {
    const currentYear = year || new Date().getFullYear();
    
    return leaveRequests
      .filter(leave => {
        const leaveYear = new Date(leave.startDate).getFullYear();
        return leaveYear === currentYear && leave.status === 'Pending';
      })
      .reduce((total, leave) => total + leave.totalDays, 0);
  }

  validateLeaveRequest(startDate: string, endDate: string, isHalfDay: boolean, currentBalance: LeaveBalance): { isValid: boolean; message: string } {
    const requestedDays = isHalfDay ? 0.5 : this.calculateDaysBetween(startDate, endDate);
    
    if (requestedDays > currentBalance.remainingDays) {
      return {
        isValid: false,
        message: `Insufficient leave balance. You have ${currentBalance.remainingDays} days remaining but requested ${requestedDays} days.`
      };
    }
    
    return { isValid: true, message: '' };
  }
}
