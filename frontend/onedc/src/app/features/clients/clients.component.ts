import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { ClientsService } from '../../core/services/clients.service';
import { Client } from '../../shared/models';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
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
  showModal = signal<boolean>(false);
  editingClient = signal<Client | null>(null);
  searchTerm = signal<string>('');
  statusFilter = signal<string>('');
  
  // Pagination
  pageSize = signal<number>(10);
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

  constructor() {
    this.clientForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      code: ['', [Validators.maxLength(20)]],
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
        (c.code && c.code.toLowerCase().includes(term))
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
    if (this.clientForm.valid) {
      const formData = this.clientForm.value;
      
      if (this.editingClient()) {
        // Update existing client
        const clientData = {
          name: formData.name,
          code: formData.code || undefined,
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
          }
        });
      } else {
        // Create new client
        const clientData = {
          name: formData.name,
          code: formData.code || undefined,
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
          }
        });
      }
    }
  }

  deleteClient(client: Client) {
    if (confirm(`Are you sure you want to delete "${client.name}"? This action cannot be undone.`)) {
      this.clientsService.delete(client.clientId).subscribe({
        next: () => {
          this.toastr.success('Client deleted successfully');
          this.loadClients();
        },
        error: (err) => {
          console.error('Failed to delete client:', err);
          this.toastr.error('Failed to delete client');
        }
      });
    }
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

  onPageSizeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.pageSize.set(parseInt(target.value));
    this.pageIndex.set(0); // Reset to first page
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
}
