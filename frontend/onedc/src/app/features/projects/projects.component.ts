import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ProjectsService } from '../../core/services/projects.service';
import { ClientsService } from '../../core/services/clients.service';
import { UsersService } from '../../core/services/users.service';
import { Project, Client } from '../../shared/models';
import { AppUser } from '../../core/services/users.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {
  private projectsService = inject(ProjectsService);
  private clientsService = inject(ClientsService);
  private usersService = inject(UsersService);
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);

  // Make Math available in template
  Math = Math;

  // Signals for reactive state management
  projects = signal<Project[]>([]);
  clients = signal<Client[]>([]);
  users = signal<AppUser[]>([]);
  filteredProjects = signal<Project[]>([]);
  loading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  editingProject = signal<Project | null>(null);
  searchTerm = signal<string>('');
  statusFilter = signal<string>('');
  
  // Pagination
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);
  
  // Computed properties
  totalPages = computed(() => Math.ceil(this.filteredProjects().length / this.pageSize()));
  paginatedProjects = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredProjects().slice(start, end);
  });

  // Form
  projectForm: FormGroup;

  constructor() {
    this.projectForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(20)]],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      clientId: ['', Validators.required],
      status: ['ACTIVE', Validators.required],
      billable: [true],
      defaultApprover: [''],
      startDate: [''],
      endDate: [''],
      budgetHours: ['', [Validators.min(0)]],
      budgetCost: ['', [Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.loadClients(); // Load clients first for dropdown
    this.loadUsers();
    this.loadProjects(); // Load projects last (they include client data via navigation)
  }

  loadProjects() {
    this.loading.set(true);
    this.projectsService.getAll().subscribe({
      next: (data) => {
        console.log('Projects loaded:', data);
        this.projects.set(data);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load projects:', err);
        this.toastr.error('Failed to load projects');
        this.loading.set(false);
      }
    });
  }

  loadClients() {
    console.log('Loading clients from API...');
    this.clientsService.getAll().subscribe({
      next: (data) => {
        console.log('Clients loaded successfully from API:', data);
        this.clients.set(data);
      },
      error: (err) => {
        console.error('Failed to load clients from API:', err);
        
        // Fallback: Extract unique clients from loaded projects
        const projectClients = this.projects()
          .filter(p => p.client)
          .map(p => p.client!)
          .filter((client, index, self) => 
            self.findIndex(c => c.clientId === client.clientId) === index
          );
        
        console.log('Using clients from projects as fallback:', projectClients);
        this.clients.set(projectClients);
        
        this.toastr.warning('Using client data from projects. Some features may be limited.');
      }
    });
  }

  loadUsers() {
    this.usersService.list(true).subscribe({
      next: (data) => this.users.set(data),
      error: (err) => console.error('Failed to load users:', err)
    });
  }

  applyFilters() {
    let filtered = this.projects();
    
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.code.toLowerCase().includes(term)
      );
    }
    
    if (this.statusFilter()) {
      filtered = filtered.filter(p => p.status === this.statusFilter());
    }
    
    this.filteredProjects.set(filtered);
    this.pageIndex.set(0); // Reset to first page when filtering
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.applyFilters();
  }

  onStatusFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.statusFilter.set(target.value);
    this.applyFilters();
  }

  openCreateModal() {
    this.editingProject.set(null);
    this.projectForm.reset({
      status: 'ACTIVE',
      billable: true
    });
    this.showModal.set(true);
  }

  openEditModal(project: Project) {
    this.editingProject.set(project);
    this.projectForm.patchValue({
      code: project.code,
      name: project.name,
      clientId: project.clientId,
      status: project.status,
      billable: project.billable,
      defaultApprover: project.defaultApprover || '',
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      budgetHours: project.budgetHours || '',
      budgetCost: project.budgetCost || ''
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingProject.set(null);
    this.projectForm.reset();
  }

  onSubmit() {
    if (this.projectForm.valid) {
      const formData = this.projectForm.value;
      
      if (this.editingProject()) {
        // Update existing project - send complete object
        const projectData = {
          ...this.editingProject()!, // Start with existing project data
          code: formData.code,
          name: formData.name,
          clientId: formData.clientId,
          status: formData.status,
          billable: formData.billable || false,
          defaultApprover: formData.defaultApprover || undefined,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          budgetHours: formData.budgetHours ? parseFloat(formData.budgetHours) : undefined,
          budgetCost: formData.budgetCost ? parseFloat(formData.budgetCost) : undefined
        };
        
        console.log('Updating project with data:', projectData);
        
        this.projectsService.update(this.editingProject()!.projectId, projectData).subscribe({
          next: () => {
            this.toastr.success('Project updated successfully');
            this.loadProjects();
            this.closeModal();
          },
          error: (err) => {
            console.error('Update failed:', err);
            this.toastr.error(`Failed to update project: ${err.error?.title || err.message}`);
          }
        });
      } else {
        // Create new project
        const projectData = {
          code: formData.code,
          name: formData.name,
          clientId: formData.clientId,
          status: formData.status,
          billable: formData.billable || false,
          defaultApprover: formData.defaultApprover || undefined,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          budgetHours: formData.budgetHours ? parseFloat(formData.budgetHours) : undefined,
          budgetCost: formData.budgetCost ? parseFloat(formData.budgetCost) : undefined
        };
        
        console.log('Creating project with data:', projectData);
        
        this.projectsService.create(projectData).subscribe({
          next: () => {
            this.toastr.success('Project created successfully');
            this.loadProjects();
            this.closeModal();
          },
          error: (err) => {
            console.error('Create failed:', err);
            this.toastr.error(`Failed to create project: ${err.error?.title || err.message}`);
          }
        });
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  deleteProject(project: Project) {
    if (confirm(`Are you sure you want to delete project "${project.name}"?`)) {
      this.projectsService.delete(project.projectId).subscribe({
        next: () => {
          this.toastr.success('Project deleted successfully');
          this.loadProjects();
        },
        error: (err) => {
          this.toastr.error('Failed to delete project');
        }
      });
    }
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
  trackByProjectId(index: number, project: Project): string {
    return project.projectId;
  }

  getClientName(clientId: string, project?: Project): string {
    // Primary approach: Use client data loaded with the project
    if (project?.client) {
      return project.client.name;
    }
    
    // Fallback: Look up in clients array (for dropdown usage)
    if (clientId) {
      const client = this.clients().find(c => c.clientId === clientId);
      if (client) {
        return client.name;
      }
    }
    
    return 'Unknown Client';
  }

  getUserName(userId: string): string {
    const user = this.users().find(u => u.userId === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Not Assigned';
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'bg-success';
      case 'ON_HOLD': return 'bg-warning';
      case 'CLOSED': return 'bg-secondary';
      default: return 'bg-primary';
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.projectForm.controls).forEach(key => {
      this.projectForm.get(key)?.markAsTouched();
    });
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.projectForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.projectForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['maxlength']) return `${fieldName} is too long`;
      if (field.errors['min']) return `${fieldName} must be positive`;
    }
    return '';
  }
}
