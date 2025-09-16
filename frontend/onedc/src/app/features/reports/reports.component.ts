import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ReportsService, ProjectUtilizationParams, ProjectUtilizationReport, ProjectUtilizationRow, ProjectBurndownParams, ProjectBurndownReport, MissingTimesheetsParams, MissingTimesheetsReport } from '../../core/services/reports.service';
import { ProjectsService } from '../../core/services/projects.service';
import { UsersService, AppUser } from '../../core/services/users.service';
import { Project } from '../../shared/models';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  private reportsService = inject(ReportsService);
  private projectsService = inject(ProjectsService);
  private usersService = inject(UsersService);
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);

  // Make Math available in template
  Math = Math;

  // Signals for reactive state management
  projects = signal<Project[]>([]);
  users = signal<AppUser[]>([]);
  loading = signal<boolean>(false);
  activeReport = signal<string>('project-utilization');

  // Project Utilization Report
  utilizationReport = signal<ProjectUtilizationReport | null>(null);
  
  // Project Burn-down Report
  burndownReport = signal<ProjectBurndownReport | null>(null);

  // Missing Timesheets Report
  missingTimesheetsReport = signal<MissingTimesheetsReport | null>(null);
  
  // Pagination for report data
  pageSize = signal<number>(25);
  pageIndex = signal<number>(0);
  
  // Computed properties
  utilizationReportData = computed(() => {
    if (this.activeReport() === 'project-utilization') {
      return this.utilizationReport()?.data || [];
    }
    return [];
  });
  
  burndownReportData = computed(() => {
    if (this.activeReport() === 'project-burndown') {
      return this.burndownReport()?.data || [];
    }
    return [];
  });
  
  missingTimesheetsReportData = computed(() => {
    if (this.activeReport() === 'missing-timesheets') {
      return this.missingTimesheetsReport()?.data || [];
    }
    return [];
  });
  
  totalPages = computed(() => {
    let dataLength = 0;
    switch (this.activeReport()) {
      case 'project-utilization':
        dataLength = this.utilizationReportData().length;
        break;
      case 'project-burndown':
        dataLength = this.burndownReportData().length;
        break;
      case 'missing-timesheets':
        dataLength = this.missingTimesheetsReportData().length;
        break;
    }
    return Math.ceil(dataLength / this.pageSize());
  });
  
  paginatedUtilizationData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.utilizationReportData().slice(start, end);
  });
  
  paginatedBurndownData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.burndownReportData().slice(start, end);
  });
  
  paginatedMissingTimesheetsData = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.missingTimesheetsReportData().slice(start, end);
  });

  // Form
  reportForm: FormGroup;

  constructor() {
    // Initialize form with current week
    const today = new Date();
    const weekStart = this.getWeekStart(today);
    const weekEnd = this.getWeekEnd(today);

    this.reportForm = this.fb.group({
      reportType: ['project-utilization', Validators.required],
      from: [this.formatDate(weekStart), Validators.required],
      to: [this.formatDate(weekEnd), Validators.required],
      projectId: [''],
      userId: [''],
      groupBy: ['project', Validators.required],
      interval: ['week', Validators.required],  // For burn-down report
      skipWeekends: [true]  // For missing timesheets report
    });
  }

  ngOnInit(): void {
    this.loadProjects();
    this.loadUsers();
    this.generateReport(); // Generate default report
  }

  loadProjects() {
    this.projectsService.getAll().subscribe({
      next: (data) => this.projects.set(data),
      error: (err) => console.error('Failed to load projects:', err)
    });
  }

  loadUsers() {
    this.usersService.list(true).subscribe({
      next: (data) => this.users.set(data),
      error: (err) => console.error('Failed to load users:', err)
    });
  }

  generateReport() {
    if (this.reportForm.valid) {
      const formData = this.reportForm.value;
      this.activeReport.set(formData.reportType);

      if (formData.reportType === 'project-utilization') {
        this.generateProjectUtilizationReport(formData);
      } else if (formData.reportType === 'project-burndown') {
        this.generateProjectBurndownReport(formData);
      } else if (formData.reportType === 'missing-timesheets') {
        this.generateMissingTimesheetsReport(formData);
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  private generateProjectUtilizationReport(formData: any) {
    const params: ProjectUtilizationParams = {
      from: formData.from,
      to: formData.to,
      groupBy: formData.groupBy,
      projectId: formData.projectId || undefined,
      userId: formData.userId || undefined
    };

    this.loading.set(true);
    this.reportsService.getProjectUtilization(params).subscribe({
      next: (report) => {
        this.utilizationReport.set(report);
        this.pageIndex.set(0); // Reset to first page
        this.loading.set(false);
        this.toastr.success('Report generated successfully');
      },
      error: (err) => {
        console.error('Failed to generate report:', err);
        this.toastr.error('Failed to generate report');
        this.loading.set(false);
      }
    });
  }

  private generateProjectBurndownReport(formData: any) {
    if (!formData.projectId) {
      this.toastr.error('Please select a project for burn-down report');
      return;
    }

    const params: ProjectBurndownParams = {
      projectId: formData.projectId,
      from: formData.from,
      to: formData.to,
      interval: formData.interval || 'week'
    };

    this.loading.set(true);
    this.reportsService.getProjectBurndown(params).subscribe({
      next: (report) => {
        this.burndownReport.set(report);
        this.pageIndex.set(0); // Reset to first page
        this.loading.set(false);
        this.toastr.success('Burn-down report generated successfully');
      },
      error: (err) => {
        console.error('Failed to generate burn-down report:', err);
        this.toastr.error('Failed to generate burn-down report');
        this.loading.set(false);
      }
    });
  }

  private generateMissingTimesheetsReport(formData: any) {
    const params: MissingTimesheetsParams = {
      from: formData.from,
      to: formData.to,
      userId: formData.userId || undefined,
      skipWeekends: formData.skipWeekends
    };

    this.loading.set(true);
    this.reportsService.getMissingTimesheets(params).subscribe({
      next: (report) => {
        this.missingTimesheetsReport.set(report);
        this.pageIndex.set(0); // Reset to first page
        this.loading.set(false);
        this.toastr.success('Missing timesheets report generated successfully');
      },
      error: (err) => {
        console.error('Failed to generate missing timesheets report:', err);
        this.toastr.error('Failed to generate missing timesheets report');
        this.loading.set(false);
      }
    });
  }

  exportToCsv() {
    if (!this.reportForm.valid) return;

    const formData = this.reportForm.value;

    if (this.activeReport() === 'project-utilization') {
      const params: ProjectUtilizationParams = {
        from: formData.from,
        to: formData.to,
        groupBy: formData.groupBy,
        projectId: formData.projectId || undefined,
        userId: formData.userId || undefined
      };

      this.reportsService.downloadProjectUtilizationCsv(params).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `project-utilization-${params.from}-${params.to}.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.toastr.success('Report exported successfully');
        },
        error: (err) => {
          console.error('Failed to export report:', err);
          this.toastr.error('Failed to export report');
        }
      });
    } else if (this.activeReport() === 'project-burndown') {
      const params: ProjectBurndownParams = {
        projectId: formData.projectId,
        from: formData.from,
        to: formData.to,
        interval: formData.interval || 'week'
      };

      this.reportsService.downloadProjectBurndownCsv(params).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `project-burndown-${params.projectId}-${params.from}-${params.to}.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.toastr.success('Burn-down report exported successfully');
        },
        error: (err) => {
          console.error('Failed to export burn-down report:', err);
          this.toastr.error('Failed to export burn-down report');
        }
      });
    } else if (this.activeReport() === 'missing-timesheets') {
      const params: MissingTimesheetsParams = {
        from: formData.from,
        to: formData.to,
        userId: formData.userId || undefined,
        skipWeekends: formData.skipWeekends
      };

      this.reportsService.downloadMissingTimesheetsCsv(params).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `missing-timesheets-${params.from}-${params.to}.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.toastr.success('Missing timesheets report exported successfully');
        },
        error: (err) => {
          console.error('Failed to export missing timesheets report:', err);
          this.toastr.error('Failed to export missing timesheets report');
        }
      });
    }
  }

  // Quick date range selections
  setCurrentWeek() {
    const today = new Date();
    this.reportForm.patchValue({
      from: this.formatDate(this.getWeekStart(today)),
      to: this.formatDate(this.getWeekEnd(today))
    });
  }

  setCurrentMonth() {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.reportForm.patchValue({
      from: this.formatDate(monthStart),
      to: this.formatDate(monthEnd)
    });
  }

  setCurrentQuarter() {
    const today = new Date();
    const quarter = Math.floor(today.getMonth() / 3);
    const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
    const quarterEnd = new Date(today.getFullYear(), quarter * 3 + 3, 0);
    this.reportForm.patchValue({
      from: this.formatDate(quarterStart),
      to: this.formatDate(quarterEnd)
    });
  }

  // Pagination methods
  goToPage(page: number) {
    this.pageIndex.set(page);
  }

  previousPage() {
    if (this.pageIndex() > 0) {
      this.pageIndex.set(this.pageIndex() - 1);
    }
  }

  nextPage() {
    if (this.pageIndex() < this.totalPages() - 1) {
      this.pageIndex.set(this.pageIndex() + 1);
    }
  }

  getPageNumbers(): number[] {
    const totalPages = this.totalPages();
    const currentPage = this.pageIndex();
    const pages: number[] = [];
    
    const start = Math.max(0, currentPage - 2);
    const end = Math.min(totalPages, start + 5);
    
    for (let i = start; i < end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Helper methods
  onReportTypeChange() {
    const reportType = this.reportForm.get('reportType')?.value;
    if (reportType === 'project-burndown') {
      // Make project selection required for burn-down report
      this.reportForm.get('projectId')?.setValidators([Validators.required]);
    } else {
      // Remove required validation for project when not needed
      this.reportForm.get('projectId')?.clearValidators();
    }
    this.reportForm.get('projectId')?.updateValueAndValidity();
  }

  getProjectName(projectId: string): string {
    const project = this.projects().find(p => p.projectId === projectId);
    return project ? `${project.code} - ${project.name}` : projectId;
  }

  getUserName(userId: string): string {
    const user = this.users().find(u => u.userId === userId);
    return user ? `${user.firstName} ${user.lastName}` : userId;
  }

  getUtilizationClass(percentage?: number): string {
    if (!percentage) return '';
    
    if (percentage >= 100) return 'text-success fw-bold';
    if (percentage >= 80) return 'text-warning';
    if (percentage >= 60) return 'text-info';
    return 'text-muted';
  }

  getBurndownProgressClass(actualHours: number, budgetHours: number): string {
    if (budgetHours === 0) return 'text-muted';
    
    const percentage = (actualHours / budgetHours) * 100;
    if (percentage > 100) return 'text-danger fw-bold';
    if (percentage > 80) return 'text-warning';
    if (percentage > 60) return 'text-info';
    return 'text-success';
  }

  formatHours(hours: number): string {
    return hours.toFixed(2);
  }

  formatPercentage(percentage?: number): string {
    return percentage ? `${percentage.toFixed(1)}%` : 'N/A';
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    return new Date(d.setDate(diff));
  }

  private getWeekEnd(date: Date): Date {
    const weekStart = this.getWeekStart(date);
    return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private markFormGroupTouched() {
    Object.keys(this.reportForm.controls).forEach(key => {
      this.reportForm.get(key)?.markAsTouched();
    });
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.reportForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.reportForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
    }
    return '';
  }
}
