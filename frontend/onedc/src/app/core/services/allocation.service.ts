import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface WeeklyAllocation {
  allocationId: string;
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  weekStartDate: string;
  weekEndDate: string;
  allocatedHours: number;
  utilizationPercentage: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAllocationRequest {
  projectId: string;
  userId: string;
  weekStartDate: string;
  weekEndDate: string;
  allocatedHours: number;
}

export interface UpdateAllocationRequest {
  allocatedHours: number;
  status?: string;
}

export interface AllocationSummary {
  projectId: string;
  projectName: string;
  totalAllocatedHours: number;
  totalEmployees: number;
  utilizationPercentage: number;
}

export interface EmployeeAllocationSummary {
  userId: string;
  userName: string;
  totalAllocatedHours: number;
  totalProjects: number;
  weeklyCapacity: number;
  utilizationPercentage: number;
}

export interface WeeklyCapacity {
  userId: string;
  userName: string;
  weekStartDate: string;
  weekEndDate: string;
  totalDays: number;
  workingDays: number; // Total Mon-Fri days in the period
  holidayDays: number;
  leaveDays: number; // Can be fractional (e.g., 0.5 for half-day leave)
  actualWorkingDays: number; // Working days after holidays/leaves
  capacityHours: number; // Actual hours employee will work (after holidays/leaves)
  leaveHours: number; // Hours lost due to leaves
  availableHours: number; // Available for new allocations (after existing allocations)
}

@Injectable({
  providedIn: 'root'
})
export class AllocationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/allocations`;

  // Get all allocations for a specific week
  getAllocationsForWeek(weekStartDate: string): Observable<WeeklyAllocation[]> {
    return this.http.get<WeeklyAllocation[]>(`${this.apiUrl}/week/${weekStartDate}`);
  }

  // Get allocations by project for a specific week
  getAllocationsByProject(projectId: string, weekStartDate: string): Observable<WeeklyAllocation[]> {
    return this.http.get<WeeklyAllocation[]>(`${this.apiUrl}/project/${projectId}/week/${weekStartDate}`);
  }

  // Get allocations by employee for a specific week
  getAllocationsByEmployee(userId: string, weekStartDate: string): Observable<WeeklyAllocation[]> {
    return this.http.get<WeeklyAllocation[]>(`${this.apiUrl}/employee/${userId}/week/${weekStartDate}`);
  }

  // Get allocation summary by projects for a week
  getProjectAllocationSummary(weekStartDate: string): Observable<AllocationSummary[]> {
    return this.http.get<AllocationSummary[]>(`${this.apiUrl}/project-summary/${weekStartDate}`);
  }

  // Get allocation summary by employees for a week
  getEmployeeAllocationSummary(weekStartDate: string): Observable<EmployeeAllocationSummary[]> {
    return this.http.get<EmployeeAllocationSummary[]>(`${this.apiUrl}/employee-summary/${weekStartDate}`);
  }

  // Create new allocation
  createAllocation(request: CreateAllocationRequest): Observable<WeeklyAllocation> {
    return this.http.post<WeeklyAllocation>(this.apiUrl, request);
  }

  // Update allocation
  updateAllocation(allocationId: string, request: UpdateAllocationRequest): Observable<WeeklyAllocation> {
    return this.http.put<WeeklyAllocation>(`${this.apiUrl}/${allocationId}`, request);
  }

  // Delete allocation
  deleteAllocation(allocationId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${allocationId}`);
  }

  // Get available projects for allocation
  getAvailableProjects(): Observable<{projectId: string, projectName: string, clientName: string, status: string}[]> {
    return this.http.get<{projectId: string, projectName: string, clientName: string, status: string}[]>(`${this.apiUrl}/available-projects`);
  }

  // Get available employees for allocation
  getAvailableEmployees(): Observable<{userId: string, userName: string, role: string}[]> {
    return this.http.get<{userId: string, userName: string, role: string}[]>(`${this.apiUrl}/available-employees`);
  }

  // Get weekly capacity for users (considering approved leaves and holidays)
  getWeeklyCapacity(weekStartDate: string, weekEndDate: string, userIds?: string[]): Observable<WeeklyCapacity[]> {
    let params = new HttpParams()
      .set('weekStartDate', weekStartDate)
      .set('weekEndDate', weekEndDate)
      .set('_t', Date.now().toString()); // Cache busting parameter
    
    if (userIds && userIds.length > 0) {
      params = params.set('userIds', userIds.join(','));
    }
    
    // Add cache-busting headers
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
    
    return this.http.get<WeeklyCapacity[]>(`${this.apiUrl}/weekly-capacity`, { 
      params,
      headers 
    });
  }

  // Export allocations to CSV
  exportToCsv(from: string, to: string, projectId?: string, userId?: string): Observable<Blob> {
    let params = new HttpParams()
      .set('from', from)
      .set('to', to);
    
    if (projectId) params = params.set('projectId', projectId);
    if (userId) params = params.set('userId', userId);

    return this.http.get(`${this.apiUrl}/export/csv`, { 
      params, 
      responseType: 'blob' 
    });
  }

  // Helper method to get week start date (Sunday)
  getWeekStartDate(date: Date): string {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // Calculate days to go back to reach Sunday
    startOfWeek.setDate(startOfWeek.getDate() - day);
    
    // Use local date to avoid timezone issues
    const year = startOfWeek.getFullYear();
    const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(startOfWeek.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
  }

  // Helper method to get week end date (Saturday, 6 days after Sunday)
  getWeekEndDate(weekStartDate: string): string {
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

  // Helper method to detect if a week spans multiple months
  isWeekSpanningMultipleMonths(weekStartDate: string): boolean {
    const [year, month, day] = weekStartDate.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    return startDate.getMonth() !== endDate.getMonth();
  }

  // Helper method to get month periods for a week that spans multiple months
  getMonthPeriodsForWeek(weekStartDate: string): Array<{startDate: string, endDate: string, month: string, days: number}> {
    const [year, month, day] = weekStartDate.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    const weekEndDate = new Date(startDate);
    weekEndDate.setDate(startDate.getDate() + 6);
    
    const periods: Array<{startDate: string, endDate: string, month: string, days: number}> = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= weekEndDate) {
      // Find the end of the current month or the week end date, whichever is earlier
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0); // Last day of current month
      const periodEndDate = endOfMonth < weekEndDate ? endOfMonth : weekEndDate;
      
      // Calculate the number of days in this period
      const days = Math.floor((periodEndDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      periods.push({
        startDate: this.formatDate(currentDate),
        endDate: this.formatDate(periodEndDate),
        month: currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        days: days
      });
      
      // Move to the next month
      currentDate = new Date(periodEndDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return periods;
  }

  // Helper method to format date as YYYY-MM-DD
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
