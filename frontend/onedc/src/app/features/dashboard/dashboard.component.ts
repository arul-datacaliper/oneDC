import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatTooltipModule,
    RouterModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})


export class DashboardComponent implements OnInit {
  private tsSvc = inject(TimesheetsService);
  private repSvc = inject(ReportsService);

  from = signal(this.iso(startOfWeek(new Date())));
  to   = signal(this.iso(endOfWeek(new Date())));

  myHours = signal({ total: 0, submitted: 0, approved: 0 });
  util = signal<UtilRow[]>([]);

  displayedColumns = ['project', 'billable_hours', 'total_hours', 'utilization_pct'];

  ngOnInit(): void {
    this.load();
  }

  load() {
    // My totals (sum of all statuses for quick glance)
    this.tsSvc.list(this.from(), this.to()).subscribe(rows => {
      const total     = rows.reduce((s: number, r: any) => s + (r.hours || 0), 0);
      const submitted = rows.filter((r: any) => r.status === 'SUBMITTED').reduce((s: number, r: any) => s + (r.hours || 0), 0);
      const approved  = rows.filter((r: any) => r.status === 'APPROVED' || r.status === 'LOCKED')
                            .reduce((s: number, r: any) => s + (r.hours || 0), 0);
      this.myHours.set({ total, submitted, approved });
    });

    // Utilization per project
    this.repSvc.utilization(this.from(), this.to(), 'project').subscribe(rows => {
      this.util.set(rows as any);
    });
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
