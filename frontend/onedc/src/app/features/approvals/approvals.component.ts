import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApprovalsService, ApprovalRow } from '../../core/services/approvals.service';
import { ProjectsService } from '../../core/services/projects.service';
import { UsersService, AppUser } from '../../core/services/users.service';
import { ToastrService } from 'ngx-toastr';

import { SelectionModel } from '@angular/cdk/collections';
import { RejectDialogComponent } from './reject-dialog.components';

type Project = { projectId: string; code: string; name: string; };

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [
    CommonModule, FormsModule
  ],
  templateUrl: './approvals.component.html',
  styleUrls: ['./approvals.component.scss']
})
export class ApprovalsComponent implements OnInit {
  private svc = inject(ApprovalsService);
  private projSvc = inject(ProjectsService);
  private usersSvc = inject(UsersService);
  private toastr = inject(ToastrService);
  Math = Math; // Make Math available in template

  // Date handling - store current selected date for the date picker
  currentDate = signal(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
  from = signal(this.iso(startOfWeek(new Date())));
  to   = signal(this.iso(endOfWeek(new Date())));
  projectId = signal<string>('');      // filter
  userId    = signal<string>('');      // filter

  projects = signal<Project[]>([]);
  users    = signal<AppUser[]>([]);
  allRows  = signal<ApprovalRow[]>([]);   // full set
  pageRows = signal<ApprovalRow[]>([]);   // current page only
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);
  total = computed(() => this.allRows().reduce((s, r) => s + (r.hours || 0), 0));

  selection = new SelectionModel<ApprovalRow>(true, []);
  processing = signal<boolean>(false);

  ngOnInit(): void {
    this.loadProjects();
    this.loadUsers();
    this.load();
  }

  private paginate() {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    this.pageRows.set(this.allRows().slice(start, end));
    // keep selection consistent: drop selections not in allRows
    const ids = new Set(this.allRows().map(r => r.entryId));
    this.selection.clear();
    // (we could also preserve selection by intersecting)
    // for simplicity, reset on each load
  }

  loadProjects() {
    this.projSvc.getAll().subscribe((ps: any[]) => {
      this.projects.set(ps.map(p => ({ projectId: p.projectId, code: p.code, name: p.name })));
    });
  }

  loadUsers() {
    this.usersSvc.list(true).subscribe(us => this.users.set(us));
  }

  load() {
    const pid = this.projectId() || undefined;
    const uid = this.userId() || undefined;
    this.svc.list(this.from(), this.to(), pid, uid).subscribe(data => {
      this.allRows.set(data);
      this.pageIndex.set(0);
      this.paginate();
    });
  }

  // single actions
  approve(r: ApprovalRow) {
    this.processing.set(true);
    this.svc.approve(r.entryId).subscribe({
      next: () => {
        this.toastr.success('Approved');
        this.allRows.set(this.allRows().filter(x => x.entryId !== r.entryId));
        this.paginate();
        this.processing.set(false);
      },
      error: err => { 
        this.processing.set(false); 
        this.toastr.error(err?.error ?? 'Approval failed');
      }
    });
  }

  reject(r: ApprovalRow) {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    this.processing.set(true);
    this.svc.reject(r.entryId, reason).subscribe({
      next: () => {
        this.toastr.success('Rejected');
        this.allRows.set(this.allRows().filter(x => x.entryId !== r.entryId));
        this.paginate();
        this.processing.set(false);
      },
      error: err => { 
        this.processing.set(false); 
        this.toastr.error(err?.error ?? 'Reject failed');
      }
    });
  }

  // bulk actions
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.pageRows().length;
    return numSelected === numRows && numRows > 0;
  }
  toggleAll() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.pageRows().forEach(r => this.selection.select(r));
    }
  }
  bulkApprove() {
    const ids = this.selection.selected.map(r => r.entryId);
    if (!ids.length) {
      this.toastr.warning('Select rows first');
      return;
    }
    this.processing.set(true);
    this.svc.bulkApprove(ids).subscribe({
      next: () => {
        this.toastr.success(`Approved ${ids.length} entries`);
        const keep = new Set(ids);
        this.allRows.set(this.allRows().filter(r => !keep.has(r.entryId)));
        this.paginate();
        this.processing.set(false);
      },
      error: err => { 
        this.processing.set(false); 
        this.toastr.error(err?.error ?? 'Bulk approve failed');
      }
    });
  }
  bulkReject() {
    const ids = this.selection.selected.map(r => r.entryId);
    if (!ids.length) {
      this.toastr.warning('Select rows first');
      return;
    }
    const reason = prompt('Please provide a reason for bulk rejection:');
    if (!reason) return;
    
    this.processing.set(true);
    this.svc.bulkReject(ids, reason).subscribe({
      next: () => {
        this.toastr.success(`Rejected ${ids.length} entries`);
        const keep = new Set(ids);
        this.allRows.set(this.allRows().filter(r => !keep.has(r.entryId)));
        this.paginate();
        this.processing.set(false);
      },
      error: err => { 
        this.processing.set(false); 
        this.toastr.error(err?.error ?? 'Bulk reject failed');
      }
    });
  }

  onProjectChange(value: string) {
    this.projectId.set(value);
    this.load();
  }

  onUserChange(value: string) {
    this.userId.set(value);
    this.load();
  }

  goToPreviousWeek() {
    // Get current date from the date picker, go back 7 days
    const currentDateObj = this.parseDate(this.currentDate());
    currentDateObj.setDate(currentDateObj.getDate() - 7);
    this.updateWeekRange(currentDateObj);
  }

  goToNextWeek() {
    // Get current date from the date picker, go forward 7 days
    const currentDateObj = this.parseDate(this.currentDate());
    currentDateObj.setDate(currentDateObj.getDate() + 7);
    this.updateWeekRange(currentDateObj);
  }

  goToCurrentWeek() {
    // Set to current week
    const today = new Date();
    this.updateWeekRange(today);
  }

  onDatePickerChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const selectedDate = this.parseDate(target.value);
    this.updateWeekRange(selectedDate);
  }

  private parseDate(dateString: string): Date {
    // Parse YYYY-MM-DD string to Date object in local timezone
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  }

  private updateWeekRange(referenceDate: Date) {
    // Update current date
    this.currentDate.set(this.iso(referenceDate));
    
    // Calculate week range
    const weekStart = startOfWeek(referenceDate);
    const weekEnd = endOfWeek(referenceDate);
    
    this.from.set(this.iso(weekStart));
    this.to.set(this.iso(weekEnd));
    
    // Reload data
    this.load();
  }

  getPageNumbers(): number[] {
    const totalPages = Math.ceil(this.allRows().length / this.pageSize());
    const currentPage = this.pageIndex();
    const pages: number[] = [];
    
    // Show up to 5 page numbers around current page
    const start = Math.max(0, currentPage - 2);
    const end = Math.min(totalPages, start + 5);
    
    for (let i = start; i < end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // paginator event
  onPage(e: {pageIndex: number, pageSize: number, length: number}) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
    this.paginate();
  }

  labelProject(r: ApprovalRow) {
    // First check if project name is already in the row data
    if (r.projectName) return r.projectName;
    
    // Look up project by projectId in the projects array
    const project = this.projects().find(p => p.projectId === r.projectId);
    if (project) {
      return project.name;
    }
    
    // Fall back to project code or project ID
    return r.projectCode || r.projectId;
  }
  
  labelUser(uid: string) {
    const u = this.users().find(x => x.userId === uid);
    return u ? `${u.firstName} ${u.lastName}` : uid;
  }
  iso(d: Date) { return d.toISOString().slice(0,10); }
}

function startOfWeek(d: Date) {
  const x = new Date(d), day = x.getDay(), diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff); x.setHours(0,0,0,0); return x;
}
function endOfWeek(d: Date) {
  const s = startOfWeek(d), x = new Date(s); x.setDate(x.getDate() + 6); x.setHours(23,59,59,999); return x;
}
