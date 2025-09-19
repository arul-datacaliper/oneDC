import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { HolidayService, Holiday, CreateHolidayRequest } from '../../../core/services/holiday.service';

@Component({
  selector: 'app-holiday-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './holiday-management.component.html',
  styleUrl: './holiday-management.component.scss'
})
export class HolidayManagementComponent implements OnInit {
  private holidayService = inject(HolidayService);
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);

  // Signals for reactive state
  holidays = signal<Holiday[]>([]);
  loading = signal<boolean>(false);
  showCreateModal = signal<boolean>(false);
  showEditModal = signal<boolean>(false);
  editingHoliday = signal<Holiday | null>(null);
  selectedYear = signal<number>(new Date().getFullYear());

  // Forms
  holidayForm!: FormGroup;

  // Computed properties
  filteredHolidays = computed(() => {
    const year = this.selectedYear();
    return this.holidays().filter(h => {
      const holidayYear = new Date(h.holidayDate).getFullYear();
      return holidayYear === year;
    }).sort((a, b) => new Date(a.holidayDate).getTime() - new Date(b.holidayDate).getTime());
  });

  availableYears = computed(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    
    // Add current year and next year
    years.add(currentYear);
    years.add(currentYear + 1);
    
    // Add years from existing holidays
    this.holidays().forEach(h => {
      years.add(new Date(h.holidayDate).getFullYear());
    });

    return Array.from(years).sort();
  });

  ngOnInit() {
    this.initializeForm();
    this.loadHolidays();
  }

  private initializeForm() {
    this.holidayForm = this.fb.group({
      holidayDate: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(2)]],
      region: ['IN', Validators.required]
    });
  }

  async loadHolidays() {
    this.loading.set(true);
    try {
      this.holidayService.getHolidays().subscribe({
        next: (holidays) => {
          this.holidays.set(holidays);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading holidays:', error);
          this.toastr.error('Failed to load holidays');
          this.loading.set(false);
        }
      });
    } catch (error) {
      console.error('Error loading holidays:', error);
      this.toastr.error('Failed to load holidays');
      this.loading.set(false);
    }
  }

  // Modal management
  openCreateModal() {
    this.holidayForm.reset();
    this.holidayForm.patchValue({ region: 'IN' });
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.holidayForm.reset();
  }

  openEditModal(holiday: Holiday) {
    this.editingHoliday.set(holiday);
    this.holidayForm.patchValue({
      holidayDate: holiday.holidayDate,
      name: holiday.name,
      region: holiday.region
    });
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingHoliday.set(null);
    this.holidayForm.reset();
  }

  async createHoliday() {
    if (this.holidayForm.valid && !this.loading()) {
      this.loading.set(true);
      try {
        const formValue = this.holidayForm.value as CreateHolidayRequest;
        
        this.holidayService.createHoliday(formValue).subscribe({
          next: (holiday) => {
            const currentHolidays = this.holidays();
            this.holidays.set([...currentHolidays, holiday]);
            this.toastr.success('Holiday created successfully');
            this.closeCreateModal();
            this.loading.set(false);
          },
          error: (error) => {
            console.error('Error creating holiday:', error);
            this.toastr.error('Failed to create holiday');
            this.loading.set(false);
          }
        });
      } catch (error) {
        console.error('Error creating holiday:', error);
        this.toastr.error('Failed to create holiday');
        this.loading.set(false);
      }
    }
  }

  async updateHoliday() {
    if (this.holidayForm.valid && !this.loading() && this.editingHoliday()) {
      this.loading.set(true);
      try {
        const formValue = this.holidayForm.value as CreateHolidayRequest;
        const originalDate = this.editingHoliday()!.holidayDate;
        
        this.holidayService.updateHoliday(originalDate, formValue).subscribe({
          next: (holiday) => {
            const currentHolidays = this.holidays();
            const updatedHolidays = currentHolidays.map(h => 
              h.holidayDate === originalDate ? holiday : h
            );
            this.holidays.set(updatedHolidays);
            this.toastr.success('Holiday updated successfully');
            this.closeEditModal();
            this.loading.set(false);
          },
          error: (error) => {
            console.error('Error updating holiday:', error);
            this.toastr.error('Failed to update holiday');
            this.loading.set(false);
          }
        });
      } catch (error) {
        console.error('Error updating holiday:', error);
        this.toastr.error('Failed to update holiday');
        this.loading.set(false);
      }
    }
  }

  async deleteHoliday(holiday: Holiday) {
    if (confirm(`Are you sure you want to delete "${holiday.name}"?`)) {
      this.loading.set(true);
      try {
        this.holidayService.deleteHoliday(holiday.holidayDate, holiday.region).subscribe({
          next: () => {
            const currentHolidays = this.holidays();
            const updatedHolidays = currentHolidays.filter(h => h.holidayDate !== holiday.holidayDate);
            this.holidays.set(updatedHolidays);
            this.toastr.success('Holiday deleted successfully');
            this.loading.set(false);
          },
          error: (error) => {
            console.error('Error deleting holiday:', error);
            this.toastr.error('Failed to delete holiday');
            this.loading.set(false);
          }
        });
      } catch (error) {
        console.error('Error deleting holiday:', error);
        this.toastr.error('Failed to delete holiday');
        this.loading.set(false);
      }
    }
  }

  async bulkAddDefaultHolidays() {
    const currentYear = this.selectedYear();
    const defaultHolidays: CreateHolidayRequest[] = [
      { holidayDate: `${currentYear}-01-01`, name: 'New Year Day', region: 'IN' },
      { holidayDate: `${currentYear}-01-14`, name: 'Pongal', region: 'IN' },
      { holidayDate: `${currentYear}-01-15`, name: 'Pongal', region: 'IN' },
      { holidayDate: `${currentYear}-03-31`, name: 'Idul Fitr (Ramzan)', region: 'IN' },
      { holidayDate: `${currentYear}-04-14`, name: 'Tamil New Year', region: 'IN' },
      { holidayDate: `${currentYear}-05-01`, name: 'May Day', region: 'IN' },
      { holidayDate: `${currentYear}-08-15`, name: 'Independence Day', region: 'IN' },
      { holidayDate: `${currentYear}-08-27`, name: 'Vinayaga Chaturthi', region: 'IN' },
      { holidayDate: `${currentYear}-10-01`, name: 'Ayutha Pooja', region: 'IN' },
      { holidayDate: `${currentYear}-10-02`, name: 'Gandhi Jayanti', region: 'IN' },
      { holidayDate: `${currentYear}-10-21`, name: 'Deepavali', region: 'IN' },
      { holidayDate: `${currentYear}-12-25`, name: 'Christmas', region: 'IN' }
    ];

    if (confirm(`Add default holidays for ${currentYear}? This will add ${defaultHolidays.length} holidays.`)) {
      this.loading.set(true);
      try {
        this.holidayService.bulkCreateHolidays(defaultHolidays).subscribe({
          next: (result) => {
            this.toastr.success(`Successfully added ${result.count} holidays`);
            this.loadHolidays(); // Reload to get the new holidays
          },
          error: (error) => {
            console.error('Error adding default holidays:', error);
            this.toastr.error('Failed to add default holidays');
            this.loading.set(false);
          }
        });
      } catch (error) {
        console.error('Error adding default holidays:', error);
        this.toastr.error('Failed to add default holidays');
        this.loading.set(false);
      }
    }
  }

  onYearChange(year: number) {
    this.selectedYear.set(year);
  }

  onYearSelectionChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.selectedYear.set(+target.value);
    }
  }

  getNextHoliday(): string | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingHolidays = this.holidays()
      .filter(h => new Date(h.holidayDate) >= today)
      .sort((a, b) => new Date(a.holidayDate).getTime() - new Date(b.holidayDate).getTime());
    
    if (upcomingHolidays.length > 0) {
      const nextHoliday = upcomingHolidays[0];
      return nextHoliday.name;
    }
    
    return null;
  }

  // Utility methods
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getDayOfWeek(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  isFieldInvalid(field: string): boolean {
    const formField = this.holidayForm.get(field);
    return !!(formField && formField.invalid && (formField.dirty || formField.touched));
  }

  getFieldError(field: string): string {
    const formField = this.holidayForm.get(field);
    if (formField?.errors) {
      if (formField.errors['required']) {
        return `${field} is required`;
      }
      if (formField.errors['minlength']) {
        return `${field} must be at least ${formField.errors['minlength'].requiredLength} characters`;
      }
    }
    return '';
  }
}
