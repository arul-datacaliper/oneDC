import { Component, OnInit, inject, signal, computed, effect, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TasksService, ProjectTask, TaskStatus, TasksResponse } from '../../core/services/tasks.service';
import { ProjectsService } from '../../core/services/projects.service';
import { UsersService, AppUser } from '../../core/services/users.service';
import { AuthService } from '../../core/services/auth.service';
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
  @ViewChild('tableContainer') tableContainer!: ElementRef<HTMLDivElement>;
  // make service public for template access
  tasksSvc = inject(TasksService);
  authSvc = inject(AuthService);
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
  loadingMore = signal<boolean>(false);
  tasks = signal<ProjectTask[]>([]);
  deletingTaskId = signal<string>('');
  updatingStatusTaskId = signal<string>('');

  // Pagination state
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);
  totalCount = signal<number>(0);
  totalPages = signal<number>(0);
  hasMorePages = computed(() => this.currentPage() < this.totalPages());
  
  // Remove old pagination logic
  // pageSize = signal<number>(10);
  // pageIndex = signal<number>(0);
  // Frontend filtering - only search is applied here, other filters go to backend
  filtered = computed(() => {
    let list = this.tasks();
    
    // Apply search filter on frontend for immediate feedback
    if (this.search()) {
      const s = this.search().toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(s) || 
                             (t.description||'').toLowerCase().includes(s) ||
                             (t.label||'').toLowerCase().includes(s));
    }
    return list;
  });
  
  // Remove old pagination - we now use infinite scroll
  // pageTasks = computed(() => {
  //   const start = this.pageIndex() * this.pageSize();
  //   return this.filtered().slice(start, start + this.pageSize());
  // });
  // totalPages = computed(() => Math.ceil(this.filtered().length / this.pageSize()));

  // modal state
  showModal = signal<boolean>(false);
  editMode = signal<boolean>(false);
  duplicateMode = signal<boolean>(false);
  viewMode = signal<boolean>(false);
  activeTask = signal<ProjectTask|null>(null);
  saving = signal<boolean>(false);

  // Effects to reload tasks when filters change
  private statusFilterEffect = effect(() => {
    // Reload tasks when status filter changes
    this.statusFilter();
    if (this.projectId()) {
      this.loadTasks();
    }
  });
  
  private assigneeFilterEffect = effect(() => {
    // Reload tasks when assignee filter changes
    this.assigneeFilter();
    if (this.projectId()) {
      this.loadTasks();
    }
  });

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

  loadTasks(loadMore: boolean = false) {
    if (!this.projectId()) {
      this.tasks.set([]);
      return; 
    }
    
    if (loadMore) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
      this.resetPagination();
    }
    
    const page = loadMore ? this.currentPage() + 1 : 1;
    
    // Build options object with filters
    const options: any = { 
      page, 
      pageSize: this.pageSize() 
    };
    
    // Add backend filters
    if (this.statusFilter()) {
      options.status = this.statusFilter();
    }
    if (this.assigneeFilter()) {
      options.assignedUserId = this.assigneeFilter();
    }
    
    this.tasksSvc.list(this.projectId(), options).subscribe({
      next: (response) => {
        console.log('Tasks response from API:', response); // Debug log
        
        if (loadMore) {
          // Append new tasks to existing ones
          this.tasks.set([...this.tasks(), ...response.tasks]);
          this.currentPage.set(page);
        } else {
          // Replace all tasks
          this.tasks.set(response.tasks);
          this.currentPage.set(1);
        }
        
        // Update pagination info
        this.totalCount.set(response.pagination.totalCount);
        this.totalPages.set(response.pagination.totalPages);
        
        if (loadMore) {
          this.loadingMore.set(false);
        } else {
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Error loading tasks:', err);
        if (loadMore) {
          this.loadingMore.set(false);
        } else {
          this.loading.set(false);
        }
      }
    });
  }

  private resetPagination() {
    this.currentPage.set(1);
    this.totalCount.set(0);
    this.totalPages.set(0);
  }

  openCreate() {
    this.activeTask.set(null);
    this.editMode.set(false);
    this.duplicateMode.set(false);
    this.viewMode.set(false);
    this.showModal.set(true);
  }
  openEdit(t: ProjectTask) {
    this.activeTask.set(t);
    this.editMode.set(true);
    this.duplicateMode.set(false);
    this.viewMode.set(false);
    this.showModal.set(true);
  }
  openDuplicate(t: ProjectTask) {
    this.activeTask.set(t);
    this.editMode.set(false);
    this.duplicateMode.set(true);
    this.viewMode.set(false);
    this.showModal.set(true);
  }
  openView(t: ProjectTask) {
    this.activeTask.set(t);
    this.editMode.set(false);
    this.duplicateMode.set(false);
    this.viewMode.set(true);
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

  onProjectChange(option: DropdownOption | null) {
    this.projectId.set(option?.value || '');
    this.loadTasks();
  }

  onAssigneeFilterChange(option: DropdownOption | null) {
    this.assigneeFilter.set(option?.value || '');
  }

  // Helper method to check if user can see all tasks
  canViewAllTasks(): boolean {
    return this.authSvc.isAdmin() || this.authSvc.isApprover();
  }

  onScroll(event: Event) {
    const element = event.target as HTMLElement;
    const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
    
    if (atBottom && this.hasMorePages() && !this.loadingMore() && !this.loading()) {
      this.loadTasks(true);
    }
  }
}
