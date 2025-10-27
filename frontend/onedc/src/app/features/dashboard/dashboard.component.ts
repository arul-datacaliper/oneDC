import { Component, computed, OnInit, OnDestroy, inject, HostListener, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AdminService, AdminDashboardMetrics, TopProjectMetrics, ProjectReleaseInfo } from '../../core/services/admin.service';
import { EmployeeService, EmployeeDashboardMetrics, EmployeeTask, TimesheetSummary, ProjectUtilization } from '../../core/services/employee.service';
import { AllocationService, EmployeeAllocationSummary, AllocationSummary } from '../../core/services/allocation.service';
import { OnboardingService, UserProfile } from '../../core/services/onboarding.service';
import { Subscription, filter } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartEvent, ChartType } from 'chart.js';

export interface TimesheetEntry {
  date: string;
  project: string;
  hours: number;
  status: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);
  private employeeService = inject(EmployeeService);
  private onboardingService = inject(OnboardingService);
  private allocationService = inject(AllocationService);
  private router = inject(Router);
  private routerSubscription?: Subscription;

  // User profile data
  userProfile = signal<UserProfile | null>(null);

  // Admin dashboard data
  adminMetrics: AdminDashboardMetrics | null = null;
  topProjects: TopProjectMetrics[] = [];
  projectsWithReleaseInfo: ProjectReleaseInfo[] = [];
  
  // Employee dashboard data
  employeeMetrics: EmployeeDashboardMetrics | null = null;
  employeeTasks: EmployeeTask[] = [];
  timesheetSummary: TimesheetSummary | null = null;
  projectUtilization: ProjectUtilization[] = [];
  recentTimesheets: TimesheetEntry[] = [];
  weeklyHours = 0;
  pendingApprovals = 0;
  
  // Employee allocation data
  employeeAllocations = signal<EmployeeAllocationSummary[]>([]);
  allocationSearchTerm = signal('');
  utilizationFilter = signal<string>('all'); // 'all', 'over100', 'full', '80-99', '50-79', 'under50', '0'
  displayedEmployeeCount = signal(10); // Initially show 10 employees
  selectedWeekStart = signal<string>('');
  selectedWeekEnd = signal<string>('');
  
  // Project allocation data
  projectAllocations = signal<AllocationSummary[]>([]);
  projectSearchTerm = signal('');
  
  // Chart configuration for employee allocation
  showAllocationChart = signal(true); // Toggle between chart and table view
  selectedAllocationFilter = signal<string>(''); // Track which pie segment was clicked
  
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  
  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: {
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i] as number;
                return {
                  text: `${label}: ${value}`,
                  fillStyle: (data.datasets[0].backgroundColor as string[])[i],
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed;
            const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} employees (${percentage}%)`;
          }
        }
      }
    },
    onClick: (event: ChartEvent, activeElements: any[]) => {
      if (activeElements.length > 0) {
        const index = activeElements[0].index;
        const filterMap = ['over100', 'full', '80-99', '50-79', 'under50', '0'];
        const selectedFilter = filterMap[index];
        this.onPieChartClick(selectedFilter);
      }
    }
  };

  public pieChartData: ChartData<'pie', number[], string> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        'rgba(220, 53, 69, 0.8)',   // Red for over 100%
        'rgba(25, 135, 84, 0.8)',   // Green for 100%
        'rgba(13, 202, 240, 0.8)',  // Cyan for 80-99%
        'rgba(255, 193, 7, 0.8)',   // Yellow for 50-79%
        'rgba(255, 193, 7, 0.6)',   // Light yellow for under 50%
        'rgba(108, 117, 125, 0.8)'  // Gray for 0%
      ],
      borderColor: [
        'rgba(220, 53, 69, 1)',
        'rgba(25, 135, 84, 1)',
        'rgba(13, 202, 240, 1)',
        'rgba(255, 193, 7, 1)',
        'rgba(255, 193, 7, 0.8)',
        'rgba(108, 117, 125, 1)'
      ],
      borderWidth: 2
    }]
  };

  public pieChartType: ChartType = 'pie';
  
  filteredEmployeeAllocations = computed(() => {
    const searchTerm = this.allocationSearchTerm().toLowerCase();
    const filter = this.utilizationFilter();
    let allEmployees = this.employeeAllocations();
    
    // Apply utilization filter first
    if (filter !== 'all') {
      allEmployees = allEmployees.filter(emp => {
        const utilization = emp.utilizationPercentage;
        switch(filter) {
          case 'over100': return utilization > 100; // Over-allocated
          case 'full': return utilization === 100; // Fully utilized
          case '80-99': return utilization >= 80 && utilization < 100; // Well utilized
          case '50-79': return utilization >= 50 && utilization < 80; // Moderately utilized
          case 'under50': return utilization > 0 && utilization < 50; // Under-utilized
          case '0': return utilization === 0; // Not allocated
          default: return true;
        }
      });
    }
    
    // Apply search filter
    if (searchTerm) {
      // When searching, return all matching results
      return allEmployees.filter(emp => 
        emp.userName.toLowerCase().includes(searchTerm) ||
        emp.userId.toLowerCase().includes(searchTerm)
      );
    }
    
    // When utilization filter is active (not 'all'), show all filtered results
    if (filter !== 'all') {
      return allEmployees;
    }
    
    // When not searching or filtering, return only the displayed count
    return allEmployees.slice(0, this.displayedEmployeeCount());
  });
  
  filteredProjectAllocations = computed(() => {
    const searchTerm = this.projectSearchTerm().toLowerCase();
    const allProjects = this.projectAllocations();
    
    if (searchTerm) {
      return allProjects.filter(project => 
        project.projectName.toLowerCase().includes(searchTerm) ||
        project.projectId.toLowerCase().includes(searchTerm)
      );
    }
    
    return allProjects;
  });

  // Loading states
  isLoadingAdminMetrics = false;
  isLoadingTopProjects = false;
  isLoadingProjectsReleaseInfo = false;
  isLoadingEmployeeData = false;
  isLoadingAllocations = false;

  // Computed property to get current user data
  currentUser = computed(() => {
    return this.authService.getCurrentUser();
  });

  // Computed property to check if user is admin
  isAdmin = computed(() => {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.role === 'ADMIN';
  });

  // Computed property to check if user is employee (not admin or approver)
  isEmployee = computed(() => {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.role === 'EMPLOYEE';
  });

  ngOnInit() {
    // Subscribe to router events to refresh dashboard when navigating back
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (event.url === '/dashboard' || event.url === '/') {
          this.loadDashboardData();
        }
      });

    this.loadDashboardData();
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  @HostListener('window:focus', ['$event'])
  onWindowFocus(event: any): void {
    // Refresh dashboard data when window regains focus
    this.refresh();
  }

  private loadDashboardData() {
    // Load user profile for profile photo
    this.loadUserProfile();
    
    if (this.isAdmin()) {
      this.loadAdminDashboard();
    } else {
      this.loadEmployeeDashboard();
    }
  }

  private loadAdminDashboard() {
    this.loadAdminMetrics();
    this.loadTopProjects();
    this.loadProjectsWithReleaseInfo();
    this.loadEmployeeAllocations();
  }

  private loadAdminMetrics() {
    this.isLoadingAdminMetrics = true;
    this.adminService.getDashboardMetrics().subscribe({
      next: (metrics) => {
        this.adminMetrics = metrics;
        this.isLoadingAdminMetrics = false;
      },
      error: (error) => {
        console.error('Error loading admin metrics:', error);
        this.isLoadingAdminMetrics = false;
      }
    });
  }

  private loadTopProjects() {
    this.isLoadingTopProjects = true;
    this.adminService.getTopProjects().subscribe({
      next: (projects: TopProjectMetrics[]) => {
        this.topProjects = projects;
        this.isLoadingTopProjects = false;
      },
      error: (error: any) => {
        console.error('Error loading top projects:', error);
        this.isLoadingTopProjects = false;
      }
    });
  }

  private loadProjectsWithReleaseInfo() {
    this.isLoadingProjectsReleaseInfo = true;
    this.adminService.getProjectsWithReleaseInfo().subscribe({
      next: (projects: ProjectReleaseInfo[]) => {
        this.projectsWithReleaseInfo = projects;
        this.isLoadingProjectsReleaseInfo = false;
      },
      error: (error: any) => {
        console.error('Error loading projects with release info:', error);
        this.isLoadingProjectsReleaseInfo = false;
      }
    });
  }

  private loadEmployeeAllocations() {
    this.isLoadingAllocations = true;
    // Reset displayed count to initial value
    this.displayedEmployeeCount.set(10);
    
    // Get current week start date or use selected date
    let weekStartDate: string;
    if (this.selectedWeekStart()) {
      weekStartDate = this.selectedWeekStart();
    } else {
      const today = new Date();
      const currentWeekStart = new Date(today.setDate(today.getDate() - today.getDay()));
      weekStartDate = currentWeekStart.toISOString().split('T')[0];
      this.selectedWeekStart.set(weekStartDate);
      
      // Set week end date (6 days after start)
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      this.selectedWeekEnd.set(weekEnd.toISOString().split('T')[0]);
    }

    // Load both employee and project allocations
    this.allocationService.getEmployeeAllocationSummary(weekStartDate).subscribe({
      next: (allocations: EmployeeAllocationSummary[]) => {
        this.employeeAllocations.set(allocations);
        this.updatePieChartData(); // Update chart data when allocations are loaded
        this.isLoadingAllocations = false;
      },
      error: (error: any) => {
        console.error('Error loading employee allocations:', error);
        this.isLoadingAllocations = false;
      }
    });
    
    // Load project allocations
    this.loadProjectAllocations(weekStartDate);
  }
  
  private loadProjectAllocations(weekStartDate?: string) {
    const startDate = weekStartDate || this.selectedWeekStart();
    
    this.allocationService.getProjectAllocationSummary(startDate).subscribe({
      next: (allocations: AllocationSummary[]) => {
        this.projectAllocations.set(allocations);
      },
      error: (error: any) => {
        console.error('Error loading project allocations:', error);
      }
    });
  }
  
  // Update pie chart data based on employee allocations
  private updatePieChartData() {
    const allocations = this.employeeAllocations();
    
    const over100 = allocations.filter(emp => emp.utilizationPercentage > 100).length;
    const full = allocations.filter(emp => emp.utilizationPercentage === 100).length;
    const range80to99 = allocations.filter(emp => emp.utilizationPercentage >= 80 && emp.utilizationPercentage < 100).length;
    const range50to79 = allocations.filter(emp => emp.utilizationPercentage >= 50 && emp.utilizationPercentage < 80).length;
    const under50 = allocations.filter(emp => emp.utilizationPercentage > 0 && emp.utilizationPercentage < 50).length;
    const zero = allocations.filter(emp => emp.utilizationPercentage === 0).length;
    
    this.pieChartData = {
      labels: ['Over 100%', '100%', '80-99%', '50-79%', 'Under 50%', '0%'],
      datasets: [{
        data: [over100, full, range80to99, range50to79, under50, zero],
        backgroundColor: [
          'rgba(220, 53, 69, 0.8)',   // Red for over 100%
          'rgba(25, 135, 84, 0.8)',   // Green for 100%
          'rgba(13, 202, 240, 0.8)',  // Cyan for 80-99%
          'rgba(255, 193, 7, 0.8)',   // Yellow for 50-79%
          'rgba(255, 193, 7, 0.6)',   // Light yellow for under 50%
          'rgba(108, 117, 125, 0.8)'  // Gray for 0%
        ],
        borderColor: [
          'rgba(220, 53, 69, 1)',
          'rgba(25, 135, 84, 1)',
          'rgba(13, 202, 240, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(255, 193, 7, 0.8)',
          'rgba(108, 117, 125, 1)'
        ],
        borderWidth: 2
      }]
    };
    
    // Update the chart if it exists
    if (this.chart) {
      this.chart.update();
    }
  }
  
  // Handle pie chart segment click
  onPieChartClick(filterType: string) {
    this.selectedAllocationFilter.set(filterType);
    this.showAllocationChart.set(false);
    this.utilizationFilter.set(filterType);
    this.displayedEmployeeCount.set(1000); // Show all filtered employees
  }
  
  // Go back to chart view
  backToChartView() {
    this.showAllocationChart.set(true);
    this.selectedAllocationFilter.set('');
    this.utilizationFilter.set('all');
    this.allocationSearchTerm.set('');
    this.displayedEmployeeCount.set(10);
  }

  private loadEmployeeDashboard() {
    this.isLoadingEmployeeData = true;
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser?.userId) {
      // Load employee metrics
      this.employeeService.getEmployeeDashboardMetrics(currentUser.userId).subscribe({
        next: (metrics) => {
          this.employeeMetrics = metrics;
        },
        error: (error) => {
          console.error('Error loading employee metrics:', error);
        }
      });

      // Load assigned tasks
      this.employeeService.getAssignedTasks(currentUser.userId).subscribe({
        next: (tasks) => {
          this.employeeTasks = tasks;
        },
        error: (error) => {
          console.error('Error loading employee tasks:', error);
        }
      });

      // Load timesheet summary
      this.employeeService.getTimesheetSummary(currentUser.userId).subscribe({
        next: (summary) => {
          this.timesheetSummary = summary;
        },
        error: (error) => {
          console.error('Error loading timesheet summary:', error);
        }
      });

      // Load project utilization
      this.employeeService.getProjectUtilization(currentUser.userId).subscribe({
        next: (utilization) => {
          this.projectUtilization = utilization;
          this.isLoadingEmployeeData = false;
        },
        error: (error) => {
          console.error('Error loading project utilization:', error);
          this.isLoadingEmployeeData = false;
        }
      });
    } else {
      // Fallback mock data for testing
      setTimeout(() => {
        this.recentTimesheets = [
          { date: '2024-01-15', project: 'Project Alpha', hours: 8, status: 'Approved' },
          { date: '2024-01-14', project: 'Project Beta', hours: 6, status: 'Pending' },
          { date: '2024-01-13', project: 'Project Alpha', hours: 7, status: 'Approved' },
          { date: '2024-01-12', project: 'Project Gamma', hours: 8, status: 'Approved' },
          { date: '2024-01-11', project: 'Project Beta', hours: 5, status: 'Pending' }
        ];
        
        this.weeklyHours = 34;
        this.pendingApprovals = 2;
        this.isLoadingEmployeeData = false;
      }, 1000);
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'badge bg-success';
      case 'pending':
        return 'badge bg-warning';
      case 'rejected':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  }

  getUtilizationBadgeClass(percentage: number): string {
    if (percentage >= 90) {
      return 'badge bg-success';
    } else if (percentage >= 70) {
      return 'badge bg-warning';
    } else {
      return 'badge bg-danger';
    }
  }

  getTaskStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'badge bg-success';
      case 'in progress':
      case 'in-progress':
        return 'badge bg-primary';
      case 'pending':
        return 'badge bg-warning';
      case 'cancelled':
      case 'canceled':
        return 'badge bg-danger';
      case 'on hold':
      case 'on-hold':
        return 'badge bg-secondary';
      default:
        return 'badge bg-info';
    }
  }

  getProjectStatusBadgeClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
        return 'badge bg-success';
      case 'completed':
        return 'badge bg-primary';
      case 'on hold':
      case 'on-hold':
        return 'badge bg-warning';
      case 'cancelled':
      case 'canceled':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  }

  getOverallUtilization(): number {
    if (!this.projectUtilization || this.projectUtilization.length === 0) {
      return 0;
    }
    
    const totalAllocated = this.projectUtilization.reduce((sum, project) => 
      sum + project.totalAllocatedHours, 0);
    const totalWorked = this.projectUtilization.reduce((sum, project) => 
      sum + project.totalWorkedHours, 0);
    
    return totalAllocated > 0 ? Math.round((totalWorked / totalAllocated) * 100) : 0;
  }

  // Mock data for employee dashboard - replace with actual service calls
  myHours() {
    return {
      total: this.weeklyHours,
      submitted: Math.floor(this.weeklyHours * 0.6),
      approved: Math.floor(this.weeklyHours * 0.4)
    };
  }

  // Mock utilization data - replace with actual service calls
  util() {
    return [
      {
        project_name: 'Project Alpha',
        project_code: 'PA-001',
        billable: true,
        billable_hours: 32,
        total_hours: 40,
        utilization_pct: 80
      },
      {
        project_name: 'Project Beta',
        project_code: 'PB-002',
        billable: false,
        billable_hours: 0,
        total_hours: 20,
        utilization_pct: 100
      }
    ];
  }

  // Check if user can approve timesheets
  canApprove(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.role === 'APPROVER' || currentUser?.role === 'ADMIN';
  }

  // Loading state for admin section
  adminLoading(): boolean {
    return this.isLoadingAdminMetrics || this.isLoadingTopProjects || this.isLoadingProjectsReleaseInfo;
  }

  // Loading state for employee section
  employeeLoading(): boolean {
    return this.isLoadingEmployeeData;
  }

  // Date range mode (week/month)
  private dateRange = 'week';
  dateRangeMode(): string {
    return this.dateRange;
  }

  // Toggle date range
  toggleDateRange(): void {
    this.dateRange = this.dateRange === 'week' ? 'month' : 'week';
    if (!this.isAdmin()) {
      this.loadEmployeeDashboard();
    }
  }

  // Refresh data
  refresh(): void {
    // Clear current data to show loading state
    if (this.isAdmin()) {
      this.adminMetrics = null;
      this.topProjects = [];
      this.projectsWithReleaseInfo = [];
    } else {
      this.employeeMetrics = null;
      this.employeeTasks = [];
      this.timesheetSummary = null;
      this.projectUtilization = [];
    }
    
    this.loadDashboardData();
  }

  // Navigation methods
  navigateToEmployeeManagement(): void {
    this.router.navigate(['/employees']).catch(err => {
      console.error('Navigation error:', err);
    });
  }

  navigateToProjectManagement(): void {
    this.router.navigate(['/projects']).catch(err => {
      console.error('Navigation error:', err);
    });
  }

  navigateToClientManagement(): void {
    this.router.navigate(['/clients']).catch(err => {
      console.error('Navigation error:', err);
    });
  }

  navigateToApprovals(): void {
    this.router.navigate(['/approvals']).catch(err => {
      console.error('Navigation error:', err);
    });
  }

  // Navigate to tasks page with specific project selected
  navigateToProjectTasks(project: TopProjectMetrics): void {
    this.router.navigate(['/tasks'], {
      queryParams: {
        projectId: project.projectId,
        projectName: project.projectName
      }
    }).catch(err => {
      console.error('Navigation error:', err);
    });
  }

  // User profile helper methods
  getCurrentUserName(): string {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.name || 'User';
  }

  getCurrentUserEmail(): string {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.email || 'user@onedc.local';
  }

  getCurrentUserRole(): string {
    const currentUser = this.authService.getCurrentUser();
    const role = currentUser?.role || 'EMPLOYEE';
    
    // Convert role to display format
    switch (role) {
      case 'ADMIN':
        return 'Administrator';
      case 'APPROVER':
        return 'Approver';
      case 'EMPLOYEE':
      default:
        return 'Employee';
    }
  }

  getCurrentUserId(): string {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.userId || '';
  }

  // Check if profile and dashboard data are in sync
  isProfileDataSynced(): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !this.employeeMetrics) {
      return true; // If no data to compare, assume synced
    }
    
    // Here you can add more validation if needed
    // For example, checking if the user ID matches between auth and employee data
    return true;
  }

  // Get profile completeness percentage (can be enhanced later)
  getProfileCompleteness(): number {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return 0;
    
    let completeness = 0;
    if (currentUser.name) completeness += 25;
    if (currentUser.email) completeness += 25;
    if (currentUser.role) completeness += 25;
    if (currentUser.userId) completeness += 25;
    
    return completeness;
  }

  // Navigate to user profile page
  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  // Load user profile for profile photo
  private loadUserProfile(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser?.userId) {
      this.onboardingService.getUserProfile(currentUser.userId).subscribe({
        next: (profile) => {
          this.userProfile.set(profile);
        },
        error: (error) => {
          console.error('Error loading user profile:', error);
          this.userProfile.set(null);
        }
      });
    }
  }

  // Get the profile photo URL with correct base URL
  getProfilePhotoUrl(): string | null {
    const profile = this.userProfile();
    if (profile?.profilePhotoUrl) {
      // The profilePhotoUrl from database storage contains the relative path: /api/files/profile-photos/{filename}
      // If the URL is relative, prepend the API base URL
      if (profile.profilePhotoUrl.startsWith('/')) {
        // Use environment configuration for the base URL
        const baseUrl = environment.apiBaseUrl.replace('/api', ''); // Remove /api to get just the server URL
        return `${baseUrl}${profile.profilePhotoUrl}`;
      }
      // If it's already a full URL, return as is
      return profile.profilePhotoUrl;
    }
    return null;
  }

  // Employee allocation methods
  onAllocationSearch(searchTerm: string): void {
    this.allocationSearchTerm.set(searchTerm);
  }
  
  // Project allocation methods
  onProjectSearch(searchTerm: string): void {
    this.projectSearchTerm.set(searchTerm);
  }

  onUtilizationFilterChange(filter: string): void {
    this.utilizationFilter.set(filter);
    this.displayedEmployeeCount.set(10); // Reset to show first 10 when filter changes
  }

  getUtilizationFilterCount(filter: string): number {
    const allEmployees = this.employeeAllocations();
    
    switch(filter) {
      case 'all': 
        return allEmployees.length;
      case 'over100': 
        return allEmployees.filter(emp => emp.utilizationPercentage > 100).length;
      case 'full': 
        return allEmployees.filter(emp => emp.utilizationPercentage === 100).length;
      case '80-99': 
        return allEmployees.filter(emp => emp.utilizationPercentage >= 80 && emp.utilizationPercentage < 100).length;
      case '50-79': 
        return allEmployees.filter(emp => emp.utilizationPercentage >= 50 && emp.utilizationPercentage < 80).length;
      case 'under50': 
        return allEmployees.filter(emp => emp.utilizationPercentage > 0 && emp.utilizationPercentage < 50).length;
      case '0': 
        return allEmployees.filter(emp => emp.utilizationPercentage === 0).length;
      default: 
        return 0;
    }
  }

  onAllocationScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Check if scrolled near bottom (within 50px)
    if (scrollHeight - scrollTop - clientHeight < 50) {
      const currentCount = this.displayedEmployeeCount();
      const totalCount = this.employeeAllocations().length;
      
      // Load 10 more employees if not all are displayed
      if (currentCount < totalCount) {
        this.displayedEmployeeCount.set(Math.min(currentCount + 10, totalCount));
      }
    }
  }

  loadMoreEmployees(): void {
    const currentCount = this.displayedEmployeeCount();
    const totalCount = this.employeeAllocations().length;
    
    // Load 10 more employees
    if (currentCount < totalCount) {
      this.displayedEmployeeCount.set(Math.min(currentCount + 10, totalCount));
    }
  }

  hasMoreEmployeesToLoad(): boolean {
    // Check if there are more employees to load based on current filters
    if (this.allocationSearchTerm() || this.utilizationFilter() !== 'all') {
      // When filtering or searching, all results are already shown
      return false;
    }
    return this.displayedEmployeeCount() < this.employeeAllocations().length;
  }

  getUtilizationPercentageClass(percentage: number): string {
    if (percentage >= 90) {
      return 'text-success fw-bold';
    } else if (percentage >= 70) {
      return 'text-warning fw-bold';
    } else {
      return 'text-danger fw-bold';
    }
  }

  trackByEmployeeId(index: number, employee: EmployeeAllocationSummary): string {
    return employee.userId;
  }
  
  trackByProjectId(index: number, project: AllocationSummary): string {
    return project.projectId;
  }

  // Week navigation for allocations
  onWeekStartChange(dateString: string): void {
    if (dateString) {
      const startDate = new Date(dateString);
      // Set to Sunday of the selected week
      const sunday = new Date(startDate);
      sunday.setDate(startDate.getDate() - startDate.getDay());
      
      const weekStartFormatted = sunday.toISOString().split('T')[0];
      this.selectedWeekStart.set(weekStartFormatted);
      
      // Calculate week end (Saturday)
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      this.selectedWeekEnd.set(saturday.toISOString().split('T')[0]);
      
      // Reload allocations for the new week
      this.loadEmployeeAllocations();
    }
  }

  navigateToPreviousWeek(): void {
    const currentStart = new Date(this.selectedWeekStart());
    currentStart.setDate(currentStart.getDate() - 7);
    const newStart = currentStart.toISOString().split('T')[0];
    this.selectedWeekStart.set(newStart);
    
    const newEnd = new Date(currentStart);
    newEnd.setDate(newEnd.getDate() + 6);
    this.selectedWeekEnd.set(newEnd.toISOString().split('T')[0]);
    
    this.loadEmployeeAllocations();
  }

  navigateToNextWeek(): void {
    const currentStart = new Date(this.selectedWeekStart());
    currentStart.setDate(currentStart.getDate() + 7);
    const newStart = currentStart.toISOString().split('T')[0];
    this.selectedWeekStart.set(newStart);
    
    const newEnd = new Date(currentStart);
    newEnd.setDate(newEnd.getDate() + 6);
    this.selectedWeekEnd.set(newEnd.toISOString().split('T')[0]);
    
    this.loadEmployeeAllocations();
  }

  navigateToCurrentWeek(): void {
    const today = new Date();
    const sunday = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekStart = sunday.toISOString().split('T')[0];
    this.selectedWeekStart.set(weekStart);
    
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    this.selectedWeekEnd.set(saturday.toISOString().split('T')[0]);
    
    this.loadEmployeeAllocations();
  }

  getFormattedWeekRange(): string {
    if (this.selectedWeekStart() && this.selectedWeekEnd()) {
      const start = new Date(this.selectedWeekStart());
      const end = new Date(this.selectedWeekEnd());
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
      return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
    }
    return '';
  }
}
