import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ClientsService } from '../../core/services/clients.service';
import { Client } from '../../shared/models';
import { ToastrService } from 'ngx-toastr';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/components/confirmation-dialog.component';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ConfirmationDialogComponent],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss'
})
export class ClientsComponent implements OnInit {
  private clientsService = inject(ClientsService);
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);

  // Make Math available in template
  Math = Math;

  // Signals for reactive state management
  clients = signal<Client[]>([]);
  filteredClients = signal<Client[]>([]);
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false); // Add submitting state to prevent duplicate submissions
  showModal = signal<boolean>(false);
  editingClient = signal<Client | null>(null);
  searchTerm = signal<string>('');
  statusFilter = signal<string>('');
  
  // Pagination
  pageSize = signal<number>(25); // Set default to 25 since no dropdown control
  pageIndex = signal<number>(0);
  
  // Computed properties
  totalPages = computed(() => Math.ceil(this.filteredClients().length / this.pageSize()));
  paginatedClients = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredClients().slice(start, end);
  });

  // Statistics
  activeClients = computed(() => this.clients().filter(c => c.status === 'ACTIVE').length);
  inactiveClients = computed(() => this.clients().filter(c => c.status === 'INACTIVE').length);

  // Form
  clientForm: FormGroup;

  // Confirmation dialog
  showConfirmDialog = signal<boolean>(false);
  confirmDialogData = signal<ConfirmationDialogData>({
    title: '',
    message: ''
  });
  clientToDelete: Client | null = null;

  constructor() {
    this.clientForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      code: ['', [Validators.maxLength(20)]],
      contactPerson: ['', [Validators.maxLength(100)]],
      email: ['', [Validators.email, Validators.maxLength(150)]],
      contactNumber: ['', [Validators.maxLength(30)]],
      country: ['', [Validators.maxLength(80)]],
      state: ['', [Validators.maxLength(80)]],
      city: ['', [Validators.maxLength(80)]],
      zipCode: ['', [Validators.maxLength(20)]],
      status: ['ACTIVE', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients() {
    this.loading.set(true);
    this.clientsService.getAll().subscribe({
      next: (data) => {
        console.log('Clients loaded:', data);
        this.clients.set(data);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load clients:', err);
        this.toastr.error('Failed to load clients');
        this.loading.set(false);
      }
    });
  }

  applyFilters() {
    let filtered = this.clients();
    
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(term) || 
        (c.code && c.code.toLowerCase().includes(term)) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.contactNumber && c.contactNumber.toLowerCase().includes(term)) ||
        (c.country && c.country.toLowerCase().includes(term)) ||
        (c.state && c.state.toLowerCase().includes(term)) ||
        (c.city && c.city.toLowerCase().includes(term))
      );
    }
    
    if (this.statusFilter()) {
      filtered = filtered.filter(c => c.status === this.statusFilter());
    }
    
    this.filteredClients.set(filtered);
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
    this.editingClient.set(null);
    this.clientForm.reset({
      status: 'ACTIVE'
    });
    this.showModal.set(true);
  }

  openEditModal(client: Client) {
    this.editingClient.set(client);
    this.clientForm.patchValue({
      name: client.name,
      code: client.code || '',
      contactPerson: client.contactPerson || '',
      email: client.email || '',
      contactNumber: client.contactNumber || '',
      country: client.country || '',
      state: client.state || '',
      city: client.city || '',
      zipCode: client.zipCode || '',
      status: client.status
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingClient.set(null);
    this.clientForm.reset();
  }

  onSubmit() {
    if (this.clientForm.valid && !this.submitting()) {
      this.submitting.set(true); // Prevent multiple submissions
      const formData = this.clientForm.value;
      
      if (this.editingClient()) {
        // Update existing client
        const clientData = {
          name: formData.name,
          code: formData.code || undefined,
          contactPerson: formData.contactPerson || undefined,
          email: formData.email || undefined,
          contactNumber: formData.contactNumber || undefined,
          country: formData.country || undefined,
          state: formData.state || undefined,
          city: formData.city || undefined,
          zipCode: formData.zipCode || undefined,
          status: formData.status
        };

        this.clientsService.update(this.editingClient()!.clientId, clientData).subscribe({
          next: (updatedClient) => {
            console.log('Client updated successfully:', updatedClient);
            this.toastr.success('Client updated successfully');
            this.loadClients();
            this.closeModal();
          },
          error: (err) => {
            console.error('Failed to update client:', err);
            this.toastr.error('Failed to update client');
          },
          complete: () => {
            this.submitting.set(false); // Reset submitting state
          }
        });
      } else {
        // Create new client
        const clientData = {
          name: formData.name,
          code: formData.code || undefined,
          contactPerson: formData.contactPerson || undefined,
          email: formData.email || undefined,
          contactNumber: formData.contactNumber || undefined,
          country: formData.country || undefined,
          state: formData.state || undefined,
          city: formData.city || undefined,
          zipCode: formData.zipCode || undefined,
          status: formData.status
        };

        this.clientsService.create(clientData).subscribe({
          next: (newClient) => {
            console.log('Client created successfully:', newClient);
            this.toastr.success('Client created successfully');
            this.loadClients();
            this.closeModal();
          },
          error: (err) => {
            console.error('Failed to create client:', err);
            this.toastr.error('Failed to create client');
          },
          complete: () => {
            this.submitting.set(false); // Reset submitting state
          }
        });
      }
    }
  }

  deleteClient(client: Client) {
    this.clientToDelete = client;
    
    // First check for dependencies
    this.clientsService.checkDependencies(client.clientId).subscribe({
      next: (dependencyInfo) => {
        if (!dependencyInfo.canDelete) {
          // Show information dialog about why deletion is not possible
          const projectDetails = dependencyInfo.dependencies.projects 
            ? dependencyInfo.dependencies.projects.map(p => `${p.name} (${p.status})`)
            : [];
          
          this.confirmDialogData.set({
            title: 'Cannot Delete Client',
            message: dependencyInfo.message,
            type: 'info',
            details: projectDetails.length > 0 ? ['Associated projects:', ...projectDetails] : undefined,
            confirmText: undefined,
            cancelText: 'OK'
          });
          this.showConfirmDialog.set(true);
          return;
        }

        // If client can be deleted, show confirmation
        this.confirmDialogData.set({
          title: 'Confirm Deletion',
          message: `Are you sure you want to delete "${client.name}"? This action cannot be undone.`,
          type: 'danger',
          confirmText: 'Delete',
          cancelText: 'Cancel'
        });
        this.showConfirmDialog.set(true);
      },
      error: (err) => {
        console.error('Failed to check dependencies:', err);
        // Fallback to direct confirmation
        this.confirmDialogData.set({
          title: 'Confirm Deletion',
          message: `Are you sure you want to delete "${client.name}"? This action cannot be undone.`,
          type: 'danger',
          confirmText: 'Delete',
          cancelText: 'Cancel'
        });
        this.showConfirmDialog.set(true);
      }
    });
  }

  onDeleteConfirmed() {
    if (this.clientToDelete) {
      this.performDelete(this.clientToDelete);
    }
    this.showConfirmDialog.set(false);
    this.clientToDelete = null;
  }

  onDeleteCancelled() {
    this.showConfirmDialog.set(false);
    this.clientToDelete = null;
  }

  private performDelete(client: Client) {
    this.clientsService.delete(client.clientId).subscribe({
      next: () => {
        this.toastr.success('Client deleted successfully');
        this.loadClients();
      },
      error: (err) => {
        console.error('Failed to delete client:', err);
        
        // Handle specific error cases
        if (err.status === 400 && err.error?.errorCode === 'FOREIGN_KEY_CONSTRAINT') {
          this.toastr.error(err.error.message, 'Cannot Delete Client', {
            timeOut: 8000,
            extendedTimeOut: 2000
          });
        } else if (err.status === 400) {
          this.toastr.error(err.error?.message || 'Cannot delete client due to existing dependencies', 'Delete Failed');
        } else {
          this.toastr.error('Failed to delete client. Please try again later.', 'Error');
        }
      }
    });
  }

  // Pagination methods
  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages()) {
      this.pageIndex.set(page);
    }
  }

  previousPage() {
    this.goToPage(this.pageIndex() - 1);
  }

  nextPage() {
    this.goToPage(this.pageIndex() + 1);
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.clientForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }

  getFieldError(fieldName: string): string {
    const field = this.clientForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['maxlength']) return `${fieldName} must be ${field.errors['maxlength'].requiredLength} characters or less`;
    }
    return '';
  }

  // Status styling
  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success';
      case 'INACTIVE':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  // Track by function for ngFor performance
  trackByClientId(index: number, client: Client): string {
    return client.clientId;
  }

  // Get page numbers for pagination
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
}
