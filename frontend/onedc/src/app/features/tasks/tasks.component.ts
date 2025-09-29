import { Component, OnInit, inject, signal, computed, effect, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TasksService, ProjectTask, TaskStatus } from '../../core/services/tasks.service';
import { ProjectsService } from '../../core/services/projects.service';
import { UsersService, AppUser } from '../../core/services/users.service';
import { TaskFormComponent } from './components/task-form.component';
import { SearchableDropdownComponent, DropdownOption } from '../../shared/components/searchable-dropdown.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskFormComponent, SearchableDropdownComponent],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit, AfterViewInit {
  // ViewChild to access the project dropdown directly
  @ViewChild('projectDropdown') projectDropdown!: SearchableDropdownComponent;
  // make service public for template access
  tasksSvc = inject(TasksService);
  private projectsSvc = inject(ProjectsService);
  private usersSvc = inject(UsersService);
  private toastr = inject(ToastrService);
  private route = inject(ActivatedRoute);

  Math = Math; // expose Math to template

  projects = signal<any[]>([]);
  users = signal<AppUser[]>([]);
  
  // Dropdown options for searchable components
  projectOptions = signal<DropdownOption[]>([]);
  assigneeOptions = signal<DropdownOption[]>([]);
  isNavigatedFromDashboard = signal<boolean>(false);

  projectId = signal<string>('');
  statusFilter = signal<TaskStatus|''>('');
  assigneeFilter = signal<string>('');
  search = signal<string>('');

  loading = signal<boolean>(false);
  tasks = signal<ProjectTask[]>([]);
  deletingTaskId = signal<string>('');
  updatingStatusTaskId = signal<string>('');

  // paging
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);
  filtered = computed(() => {
    let list = this.tasks();
    if (this.statusFilter()) list = list.filter(t => t.status === this.statusFilter());
    if (this.assigneeFilter()) list = list.filter(t => t.assignedUserId === this.assigneeFilter());
    if (this.search()) {
      const s = this.search().toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(s) || 
                             (t.description||'').toLowerCase().includes(s) ||
                             (t.label||'').toLowerCase().includes(s));
    }
    return list;
  });
  pageTasks = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  totalPages = computed(() => Math.ceil(this.filtered().length / this.pageSize()));

  // modal state
  showModal = signal<boolean>(false);
  editMode = signal<boolean>(false);
  duplicateMode = signal<boolean>(false);
  activeTask = signal<ProjectTask|null>(null);
  saving = signal<boolean>(false);

  ngAfterViewInit() {
    // After view init, if we have a projectId from query params, ensure dropdown is updated
    setTimeout(() => {
      const currentProjectId = this.projectId();
      if (currentProjectId && this.projectDropdown) {
        console.log('ngAfterViewInit: Setting dropdown value to:', currentProjectId);
        this.projectDropdown.writeValue(currentProjectId);
      }
    }, 100);
  }

  ngOnInit() {
    this.loadProjects();
    this.loadUsers();
    
    // Check for projectId query parameter
    this.route.queryParams.subscribe(params => {
      if (params['projectId']) {
        console.log('Setting projectId from query params:', params['projectId']);
        this.projectId.set(params['projectId']);
        this.isNavigatedFromDashboard.set(true);
        this.loadTasks();
      }
    });
  }

  loadProjects() { 
    this.projectsSvc.getAll().subscribe(ps => {
      this.projects.set(ps);
      this.projectOptions.set(ps.map(p => ({
        value: p.projectId,
        label: `${p.code} — ${p.name}`,
        project: p
      })));
      
      // Load tasks if a project is already selected
      if (this.projectId()) {
        this.loadTasks();
        
        // If the dropdown is available, update it directly
        setTimeout(() => {
          if (this.projectDropdown) {
            console.log('Updating dropdown with projectId:', this.projectId());
            this.projectDropdown.writeValue(this.projectId());
          }
        }, 50);
      }
    });
  }
  
  loadUsers() { 
    this.usersSvc.list(true).subscribe(us => {
      this.users.set(us);
      this.assigneeOptions.set(us.map(u => ({
        value: u.userId,
        label: `${u.firstName} ${u.lastName}`,
        user: u
      })));
    });
  }

  loadTasks() {
    if (!this.projectId()) { this.tasks.set([]); return; }
    this.loading.set(true);
    this.tasksSvc.list(this.projectId()).subscribe(ts => {
      console.log('Tasks received from API:', ts); // Debug log
      if (ts.length > 0) {
        console.log('First task dates:', {
          startDate: ts[0].startDate,
          endDate: ts[0].endDate,
          startDateType: typeof ts[0].startDate,
          endDateType: typeof ts[0].endDate
        }); // Debug log
      }
      this.tasks.set(ts);
      this.pageIndex.set(0);
      this.loading.set(false);
    }, _ => this.loading.set(false));
  }

  openCreate() {
    this.activeTask.set(null);
    this.editMode.set(false);
    this.duplicateMode.set(false);
    this.showModal.set(true);
  }
  openEdit(t: ProjectTask) {
    this.activeTask.set(t);
    this.editMode.set(true);
    this.duplicateMode.set(false);
    this.showModal.set(true);
  }
  openDuplicate(t: ProjectTask) {
    this.activeTask.set(t);
    this.editMode.set(false);
    this.duplicateMode.set(true);
    this.showModal.set(true);
  }
  closeModal() { this.showModal.set(false); }

  onSaved() {
    // gather form data from child via template reference / direct DOM would be messy; re-fetch for simplicity
    this.showModal.set(false);
    this.saving.set(false);
    this.loadTasks();
    const message = this.editMode() ? 'Task updated' : 'Task created';
    this.toastr.success(message);
  }

  onLoadingChange(loading: boolean) {
    this.saving.set(loading);
  }

  delete(t: ProjectTask) {
    if (!confirm('Delete this task?') || this.deletingTaskId()) return;
    
    this.deletingTaskId.set(t.taskId);
    this.tasksSvc.delete(t.taskId).subscribe({
      next: () => {
        this.toastr.success('Task deleted');
        this.tasks.set(this.tasks().filter(x => x.taskId !== t.taskId));
        this.deletingTaskId.set('');
      },
      error: (err) => {
        console.error('Delete failed', err);
        this.deletingTaskId.set('');
      }
    });
  }

  changeStatus(t: ProjectTask, status: TaskStatus) {
    if (t.status === status || this.updatingStatusTaskId()) return;
    
    this.updatingStatusTaskId.set(t.taskId);
    this.tasksSvc.updateStatus(t.taskId, status).subscribe({
      next: () => {
        this.toastr.success('Status updated');
        this.tasks.set(this.tasks().map(x => x.taskId === t.taskId ? { ...x, status } : x));
        this.updatingStatusTaskId.set('');
      },
      error: (err) => {
        console.error('Status update failed', err);
        this.updatingStatusTaskId.set('');
      }
    });
  }

  pageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages();
    const current = this.pageIndex();
    const start = Math.max(0, current - 2);
    const end = Math.min(total, start + 5);
    for (let i = start; i < end; i++) pages.push(i);
    return pages;
  }

  onProjectChange(option: DropdownOption | null) {
    this.projectId.set(option?.value || '');
    this.loadTasks();
  }

  onAssigneeFilterChange(option: DropdownOption | null) {
    this.assigneeFilter.set(option?.value || '');
  }
}
