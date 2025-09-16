import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TasksService, ProjectTask, TaskStatus } from '../../core/services/tasks.service';
import { ProjectsService } from '../../core/services/projects.service';
import { UsersService, AppUser } from '../../core/services/users.service';
import { TaskFormComponent } from './components/task-form.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskFormComponent],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit {
  // make service public for template access
  tasksSvc = inject(TasksService);
  private projectsSvc = inject(ProjectsService);
  private usersSvc = inject(UsersService);
  private toastr = inject(ToastrService);

  Math = Math; // expose Math to template

  projects = signal<any[]>([]);
  users = signal<AppUser[]>([]);

  projectId = signal<string>('');
  statusFilter = signal<TaskStatus|''>('');
  assigneeFilter = signal<string>('');
  search = signal<string>('');

  loading = signal<boolean>(false);
  tasks = signal<ProjectTask[]>([]);

  // paging
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);
  filtered = computed(() => {
    let list = this.tasks();
    if (this.statusFilter()) list = list.filter(t => t.status === this.statusFilter());
    if (this.assigneeFilter()) list = list.filter(t => t.assignedUserId === this.assigneeFilter());
    if (this.search()) {
      const s = this.search().toLowerCase();
      list = list.filter(t => t.title.toLowerCase().includes(s) || (t.description||'').toLowerCase().includes(s));
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
  activeTask = signal<ProjectTask|null>(null);

  ngOnInit() {
    this.loadProjects();
    this.loadUsers();
  }

  loadProjects() { this.projectsSvc.getAll().subscribe(ps => this.projects.set(ps)); }
  loadUsers() { this.usersSvc.list(true).subscribe(us => this.users.set(us)); }

  loadTasks() {
    if (!this.projectId()) { this.tasks.set([]); return; }
    this.loading.set(true);
    this.tasksSvc.list(this.projectId()).subscribe(ts => {
      this.tasks.set(ts);
      this.pageIndex.set(0);
      this.loading.set(false);
    }, _ => this.loading.set(false));
  }

  openCreate() {
    this.activeTask.set(null);
    this.editMode.set(false);
    this.showModal.set(true);
  }
  openEdit(t: ProjectTask) {
    this.activeTask.set(t);
    this.editMode.set(true);
    this.showModal.set(true);
  }
  closeModal() { this.showModal.set(false); }

  onSaved() {
    // gather form data from child via template reference / direct DOM would be messy; re-fetch for simplicity
    this.showModal.set(false);
    this.loadTasks();
    this.toastr.success(this.editMode() ? 'Task updated' : 'Task created');
  }

  delete(t: ProjectTask) {
    if (!confirm('Delete this task?')) return;
    this.tasksSvc.delete(t.taskId).subscribe(() => {
      this.toastr.success('Task deleted');
      this.tasks.set(this.tasks().filter(x => x.taskId !== t.taskId));
    });
  }

  changeStatus(t: ProjectTask, status: TaskStatus) {
    if (t.status === status) return;
    this.tasksSvc.updateStatus(t.taskId, status).subscribe(() => {
      this.toastr.success('Status updated');
      this.tasks.set(this.tasks().map(x => x.taskId === t.taskId ? { ...x, status } : x));
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
}
