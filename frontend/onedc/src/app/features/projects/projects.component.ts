import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

import { ProjectsService, ProjectResponseDto, ProjectCreateDto, ProjectUpdateDto, ProjectMemberDto } from '../../core/services/projects.service';
import { ClientsService } from '../../core/services/clients.service';
import { UsersService } from '../../core/services/users.service';
import { Project, Client } from '../../shared/models';
import { AppUser } from '../../core/services/users.service';
import { ToastrService } from 'ngx-toastr';

// Interface for project members
export interface ProjectMember extends AppUser {
  projectRole?: 'MEMBER' | 'LEAD' | 'CONTRIBUTOR' | 'REVIEWER';
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule],
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
  projects = signal<ProjectResponseDto[]>([]);
  clients = signal<Client[]>([]); // All clients
  users = signal<AppUser[]>([]);
  filteredProjects = signal<ProjectResponseDto[]>([]);
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false); // Add submitting state to prevent duplicate submissions
  showModal = signal<boolean>(false);
  editingProject = signal<ProjectResponseDto | null>(null);
  showViewModal = signal<boolean>(false);
  viewingProject = signal<ProjectResponseDto | null>(null);
  searchTerm = signal<string>('');
  statusFilter = signal<string>('');
  clientFilter = signal<string>('');
  
  // Computed signal for active clients only (for project creation/editing)
  activeClients = computed(() => 
    this.clients().filter(client => client.status === 'ACTIVE')
  );
  
  // Project members functionality
  selectedProjectMembers = signal<ProjectMember[]>([]);
  selectedMemberToAdd = signal<string | null>(null);
  
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

  usersWithDisplayName = computed(() => {
    // Filter only active users for project manager selection
    return this.users()
      .filter(user => user.isActive)
      .map(user => ({
        ...user,
        displayName: `${user.firstName} ${user.lastName}`
      }));
  });

  availableMembersForSelection = computed(() => {
    // Filter only active users and exclude already selected members
    const allActiveUsers = this.users()
      .filter(user => user.isActive)
      .map(user => ({
        ...user,
        displayName: `${user.firstName} ${user.lastName}`
      }));
    const selectedMemberIds = this.selectedProjectMembers().map(member => member.userId);
    return allActiveUsers.filter(user => !selectedMemberIds.includes(user.userId));
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
      defaultApprover: ['', Validators.required],
      startDate: [''],
      endDate: [''],
      plannedReleaseDate: [''],
      budgetHours: ['', [Validators.min(0)]],
      budgetCost: ['', [Validators.min(0)]]
    });

    // Add date validation
    this.setupDateValidation();
  }

  // Custom date validators
  private dateAfterValidator(startDateControlName: string): ValidatorFn {
    return (control: AbstractControl): {[key: string]: any} | null => {
      if (!control.parent) return null;
      
      const startDateControl = control.parent.get(startDateControlName);
      if (!startDateControl || !startDateControl.value || !control.value) return null;
      
      const startDate = new Date(startDateControl.value);
      const endDate = new Date(control.value);
      
      if (endDate < startDate) {
        return { 'dateAfter': { 
          actualDate: control.value, 
          requiredAfter: startDateControl.value,
          message: 'Date must be after start date'
        }};
      }
      
      return null;
    };
  }

  private setupDateValidation(): void {
    // Add validators to end date and planned release date
    const endDateControl = this.projectForm.get('endDate');
    const plannedReleaseDateControl = this.projectForm.get('plannedReleaseDate');

    if (endDateControl) {
      endDateControl.setValidators([this.dateAfterValidator('startDate')]);
    }

    if (plannedReleaseDateControl) {
      plannedReleaseDateControl.setValidators([this.dateAfterValidator('startDate')]);
    }

    // Re-validate when start date changes
    this.projectForm.get('startDate')?.valueChanges.subscribe(() => {
      endDateControl?.updateValueAndValidity();
      plannedReleaseDateControl?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.loadClients(); // Load clients first for dropdown
    this.loadUsers();
    this.loadProjects(); // Load projects last (they include client data via navigation)
  }

  loadProjects() {
    this.loading.set(true);
    this.projectsService.getAllWithMembers().subscribe({
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
        // Store ALL clients (used for filters and displaying existing project clients)
        this.clients.set(data);
        
        const activeCount = data.filter(c => c.status === 'ACTIVE').length;
        const inactiveCount = data.filter(c => c.status === 'INACTIVE').length;
        console.log(`Loaded ${activeCount} active clients and ${inactiveCount} inactive clients`);
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
    // Load all users (both active and inactive) for display purposes
    this.usersService.list(false).subscribe({
      next: (data) => {
        console.log('All users loaded:', data);
        this.users.set(data);
        
        const activeCount = data.filter(u => u.isActive).length;
        const inactiveCount = data.filter(u => !u.isActive).length;
        console.log(`Loaded ${activeCount} active users and ${inactiveCount} inactive users`);
      },
      error: (err) => {
        console.error('Failed to load users:', err);
        this.toastr.error('Failed to load users');
      }
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
    
    if (this.clientFilter()) {
      filtered = filtered.filter(p => p.clientId === this.clientFilter());
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

  onClientFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.clientFilter.set(target.value);
    this.applyFilters();
  }

  openCreateModal() {
    this.editingProject.set(null);
    this.projectForm.reset({
      status: 'ACTIVE',
      billable: true
    });
    this.selectedProjectMembers.set([]);
    this.selectedMemberToAdd.set(null);
    this.showModal.set(true);
  }

  openEditModal(project: ProjectResponseDto) {
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
      plannedReleaseDate: project.plannedReleaseDate || '',
      budgetHours: project.budgetHours || '',
      budgetCost: project.budgetCost || ''
    });
    
    // Load existing project members
    const existingMembers: ProjectMember[] = project.projectMembers.map(pm => ({
      userId: pm.userId,
      firstName: pm.firstName,
      lastName: pm.lastName,
      email: pm.email,
      role: pm.role,
      isActive: true,
      jobTitle: pm.jobTitle,
      department: pm.department,
      projectRole: pm.projectRole
    }));
    
    this.selectedProjectMembers.set(existingMembers);
    this.selectedMemberToAdd.set(null);
    
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingProject.set(null);
    this.selectedProjectMembers.set([]);
    this.selectedMemberToAdd.set(null);
    this.projectForm.reset();
  }

  // View Modal Methods
  openViewModal(project: ProjectResponseDto) {
    this.viewingProject.set(project);
    this.showViewModal.set(true);
  }

  closeViewModal() {
    this.showViewModal.set(false);
    this.viewingProject.set(null);
  }

  openEditModalFromView() {
    const project = this.viewingProject();
    if (project) {
      this.closeViewModal();
      this.openEditModal(project);
    }
  }

  // Project Members Methods
  onMemberAdd(userId: string | null) {
    if (!userId) return;
    
    const user = this.users().find(u => u.userId === userId);
    if (!user) return;
    
    const projectMember: ProjectMember = {
      ...user,
      projectRole: 'MEMBER'
    };
    
    this.selectedProjectMembers.update(members => [...members, projectMember]);
    this.selectedMemberToAdd.set(null);
  }

  removeMember(userId: string) {
    this.selectedProjectMembers.update(members => 
      members.filter(member => member.userId !== userId)
    );
  }

  updateMemberProjectRole(userId: string, role: 'MEMBER' | 'LEAD' | 'CONTRIBUTOR' | 'REVIEWER') {
    this.selectedProjectMembers.update(members =>
      members.map(member =>
        member.userId === userId ? { ...member, projectRole: role } : member
      )
    );
  }

  trackByMemberId(index: number, member: ProjectMember): string {
    return member.userId;
  }

  onSubmit() {
    if (this.projectForm.valid && !this.submitting()) {
      this.submitting.set(true); // Prevent multiple submissions
      const formData = this.projectForm.value;
      
      // Prepare project members data
      const projectMembers: ProjectMemberDto[] = this.selectedProjectMembers().map(member => ({
        userId: member.userId,
        projectRole: member.projectRole || 'MEMBER'
      }));
      
      if (this.editingProject()) {
        // Update existing project with members
        const projectUpdateDto: ProjectUpdateDto = {
          projectId: this.editingProject()!.projectId,
          code: formData.code,
          name: formData.name,
          clientId: formData.clientId,
          status: formData.status,
          billable: formData.billable || false,
          defaultApprover: formData.defaultApprover || undefined,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          plannedReleaseDate: formData.plannedReleaseDate || undefined,
          budgetHours: formData.budgetHours ? parseFloat(formData.budgetHours) : undefined,
          budgetCost: formData.budgetCost ? parseFloat(formData.budgetCost) : undefined,
          projectMembers: projectMembers
        };
        
        console.log('Updating project with members:', projectUpdateDto);
        
        this.projectsService.updateWithMembers(this.editingProject()!.projectId, projectUpdateDto).subscribe({
          next: () => {
            this.toastr.success('Project updated successfully');
            this.loadProjects();
            this.closeModal();
          },
          error: (err) => {
            console.error('Update failed:', err);
            
            // Handle specific error types
            if (err.status === 409) {
              // Conflict - duplicate project code
              this.toastr.error(err.error?.detail || 'A project with this code already exists');
            } else if (err.status === 408) {
              // Request timeout
              this.toastr.error(err.error?.detail || 'Request timed out. Please try again in a moment.');
            } else if (err.status === 500) {
              // Internal server error
              this.toastr.error(err.error?.detail || 'An unexpected error occurred. Please try again.');
            } else {
              // Generic error handling
              this.toastr.error(`Failed to update project: ${err.error?.title || err.error?.detail || err.message}`);
            }
          },
          complete: () => {
            this.submitting.set(false); // Reset submitting state
          }
        });
      } else {
        // Create new project with members
        const projectCreateDto: ProjectCreateDto = {
          code: formData.code,
          name: formData.name,
          clientId: formData.clientId,
          status: formData.status,
          billable: formData.billable || false,
          defaultApprover: formData.defaultApprover || undefined,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          plannedReleaseDate: formData.plannedReleaseDate || undefined,
          budgetHours: formData.budgetHours ? parseFloat(formData.budgetHours) : undefined,
          budgetCost: formData.budgetCost ? parseFloat(formData.budgetCost) : undefined,
          projectMembers: projectMembers
        };
        
        console.log('Creating project with members:', projectCreateDto);
        
        this.projectsService.createWithMembers(projectCreateDto).subscribe({
          next: () => {
            this.toastr.success('Project created successfully');
            this.loadProjects();
            this.closeModal();
          },
          error: (err) => {
            console.error('Create failed:', err);
            
            // Handle specific error types
            if (err.status === 409) {
              // Conflict - duplicate project code
              this.toastr.error(err.error?.detail || 'A project with this code already exists');
            } else if (err.status === 408) {
              // Request timeout
              this.toastr.error(err.error?.detail || 'Request timed out. Please try again in a moment.');
            } else if (err.status === 500) {
              // Internal server error
              this.toastr.error(err.error?.detail || 'An unexpected error occurred. Please try again.');
            } else {
              // Generic error handling
              this.toastr.error(`Failed to create project: ${err.error?.title || err.error?.detail || err.message}`);
            }
          },
          complete: () => {
            this.submitting.set(false); // Reset submitting state
          }
        });
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  deleteProject(project: ProjectResponseDto) {
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
  trackByProjectId(index: number, project: ProjectResponseDto): string {
    return project.projectId;
  }

  getClientName(clientId: string, project?: ProjectResponseDto): string {
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
      if (field.errors['required']) {
        // Custom messages for specific fields
        switch (fieldName) {
          case 'defaultApprover':
            return 'Project Manager is required';
          case 'clientId':
            return 'Client is required';
          case 'code':
            return 'Project Code is required';
          case 'name':
            return 'Project Name is required';
          default:
            return `${fieldName} is required`;
        }
      }
      if (field.errors['maxlength']) return `${fieldName} is too long`;
      if (field.errors['min']) return `${fieldName} must be positive`;
      if (field.errors['dateAfter']) {
        switch (fieldName) {
          case 'endDate':
            return 'End date must be after start date';
          case 'plannedReleaseDate':
            return 'Planned release date must be after start date';
          default:
            return field.errors['dateAfter'].message || 'Date must be after start date';
        }
      }
    }
    return '';
  }

  // Utility methods for view modal
  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  }

  getProjectManagerName(userId: string): string {
    if (!userId) return 'Not assigned';
    const user = this.users().find(u => u.userId === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown user';
  }

  getProjectRoleBadgeClass(role: string): string {
    switch (role) {
      case 'LEAD': return 'bg-primary';
      case 'CONTRIBUTOR': return 'bg-info';
      case 'REVIEWER': return 'bg-warning text-dark';
      case 'MEMBER': 
      default: return 'bg-secondary';
    }
  }
}
