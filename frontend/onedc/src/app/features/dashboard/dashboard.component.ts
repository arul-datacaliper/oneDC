import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { TimesheetsService } from '../../core/services/timesheets.service';
import { ReportsService } from '../../core/services/reports.service';

type UtilRow = {
  project_id?: string;
  project_code?: string;
  project_name?: string;
  billable?: boolean;
  billable_hours: number;
  total_hours: number;
  utilization_pct: number;
};
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})


export class DashboardComponent implements OnInit {
  private tsSvc = inject(TimesheetsService);
  private repSvc = inject(ReportsService);

  // Date range mode toggle
  dateRangeMode = signal<'week' | 'month'>('month');
  
  from = signal(this.iso(startOfMonth(new Date())));
  to   = signal(this.iso(endOfMonth(new Date())));

  myHours = signal({ total: 0, submitted: 0, approved: 0 });
  util = signal<UtilRow[]>([]);

  displayedColumns = ['project', 'billable_hours', 'total_hours', 'utilization_pct'];

  ngOnInit(): void {
    this.load();
  }

  load() {
    // My totals (sum of all statuses for current week for quick glance)
    const weekFrom = this.iso(startOfWeek(new Date()));
    const weekTo = this.iso(endOfWeek(new Date()));
    
    this.tsSvc.list(weekFrom, weekTo).subscribe(rows => {
      const total     = rows.reduce((s: number, r: any) => s + (r.hours || 0), 0);
      const submitted = rows.filter((r: any) => r.status === 'SUBMITTED').reduce((s: number, r: any) => s + (r.hours || 0), 0);
      const approved  = rows.filter((r: any) => r.status === 'APPROVED' || r.status === 'LOCKED')
                            .reduce((s: number, r: any) => s + (r.hours || 0), 0);
      this.myHours.set({ total, submitted, approved });
    });

    // Utilization per project (using selected date range)
    this.repSvc.utilization(this.from(), this.to(), 'project').subscribe(rows => {
      this.util.set(rows as any);
    });
  }

  toggleDateRange() {
    const newMode = this.dateRangeMode() === 'week' ? 'month' : 'week';
    this.dateRangeMode.set(newMode);
    
    if (newMode === 'week') {
      this.from.set(this.iso(startOfWeek(new Date())));
      this.to.set(this.iso(endOfWeek(new Date())));
    } else {
      this.from.set(this.iso(startOfMonth(new Date())));
      this.to.set(this.iso(endOfMonth(new Date())));
    }
    
    // Reload data with new date range
    this.repSvc.utilization(this.from(), this.to(), 'project').subscribe(rows => {
      this.util.set(rows as any);
    });
  }

  getUtilizationBadgeClass(percentage: number): string {
    if (percentage >= 80) return 'badge bg-success';
    if (percentage >= 60) return 'badge bg-warning';
    if (percentage >= 40) return 'badge bg-info';
    return 'badge bg-secondary';
  }

  iso(d: Date) { return d.toISOString().slice(0,10); }
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // make Monday start
  x.setDate(x.getDate() + diff);
  x.setHours(0,0,0,0);
  return x;
}
function endOfWeek(d: Date) {
  const s = startOfWeek(d);
  const x = new Date(s);
  x.setDate(x.getDate() + 6);
  x.setHours(23,59,59,999);
  return x;
}

function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0,0,0,0);
  return x;
}

function endOfMonth(d: Date) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + 1);
  x.setDate(0); // Last day of previous month (current month)
  x.setHours(23,59,59,999);
  return x;
}
