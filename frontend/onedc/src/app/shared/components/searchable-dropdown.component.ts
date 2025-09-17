import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface DropdownOption {
  value: any;
  label: string;
  [key: string]: any; // Allow additional properties
}

@Component({
  selector: 'app-searchable-dropdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dropdown">
      <input 
        type="text" 
        class="form-control form-control-sm dropdown-toggle" 
        [placeholder]="placeholder"
        [value]="displayValue"
        (input)="onSearch($event)"
        (focus)="onInputFocus()"
        (blur)="onInputBlur()"
        autocomplete="off">
      <div class="dropdown-menu w-100" [class.show]="showDropdown && (filteredOptions.length > 0 || searchText.length === 0)">
        <button 
          *ngIf="allowEmpty"
          type="button" 
          class="dropdown-item" 
          (mousedown)="selectOption(null)"
          [class.active]="!selectedOption">
          <span class="text-muted">{{ emptyLabel }}</span>
        </button>
        <button 
          *ngFor="let option of filteredOptions" 
          type="button" 
          class="dropdown-item" 
          (mousedown)="selectOption(option)"
          [class.active]="selectedOption?.value === option.value">
          {{ option.label }}
        </button>
        <div *ngIf="filteredOptions.length === 0 && searchText.length > 0" class="dropdown-item-text text-muted">
          {{ noResultsText }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dropdown {
      position: relative;
    }
    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 1000;
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #ced4da;
      border-radius: 0.375rem;
      background-color: white;
      box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    }
    .dropdown-item {
      display: block;
      width: 100%;
      padding: 0.375rem 0.75rem;
      clear: both;
      font-weight: 400;
      color: #212529;
      text-align: inherit;
      text-decoration: none;
      white-space: nowrap;
      background-color: transparent;
      border: 0;
      cursor: pointer;
    }
    .dropdown-item:hover, .dropdown-item:focus {
      color: #1e2125;
      background-color: #e9ecef;
    }
    .dropdown-item.active {
      color: #fff;
      background-color: #0d6efd;
    }
    .dropdown-item-text {
      display: block;
      padding: 0.375rem 0.75rem;
      margin-bottom: 0;
      font-size: 0.875rem;
      color: #6c757d;
      white-space: nowrap;
    }
  `],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableDropdownComponent),
      multi: true
    }
  ]
})
export class SearchableDropdownComponent implements ControlValueAccessor {
  @Input() options: DropdownOption[] = [];
  @Input() placeholder = 'Search...';
  @Input() allowEmpty = true;
  @Input() emptyLabel = '-- None --';
  @Input() noResultsText = 'No results found';
  @Input() searchFields: string[] = ['label']; // Fields to search in

  @Output() selectionChange = new EventEmitter<DropdownOption | null>();

  filteredOptions: DropdownOption[] = [];
  selectedOption: DropdownOption | null = null;
  showDropdown = false;
  searchText = '';
  displayValue = '';

  private onChange = (value: any) => {};
  private onTouched = () => {};

  ngOnInit() {
    this.filteredOptions = this.options;
  }

  ngOnChanges() {
    this.filteredOptions = this.options;
    // Re-apply the current value when options change
    if (this.selectedOption) {
      const newSelectedOption = this.options.find(opt => opt.value === this.selectedOption?.value);
      if (newSelectedOption) {
        this.selectedOption = newSelectedOption;
        this.displayValue = newSelectedOption.label;
      }
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    if (value) {
      this.selectedOption = this.options.find(opt => opt.value === value) || null;
      this.displayValue = this.selectedOption?.label || '';
    } else {
      this.selectedOption = null;
      this.displayValue = '';
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onSearch(event: any) {
    const value = event.target.value;
    this.searchText = value;
    this.displayValue = value;
    this.filteredOptions = this.filterOptions(value);
    this.showDropdown = true;
  }

  onInputFocus() {
    this.showDropdown = true;
    this.filteredOptions = this.options;
  }

  onInputBlur() {
    setTimeout(() => {
      this.showDropdown = false;
      this.onTouched();
    }, 150);
  }

  selectOption(option: DropdownOption | null) {
    this.selectedOption = option;
    this.showDropdown = false;
    
    if (option) {
      this.displayValue = option.label;
      this.onChange(option.value);
    } else {
      this.displayValue = '';
      this.onChange(null);
    }
    
    this.selectionChange.emit(option);
  }

  private filterOptions(searchValue: string): DropdownOption[] {
    if (!searchValue || searchValue.trim() === '') {
      return this.options;
    }
    
    const filterValue = searchValue.toLowerCase().trim();
    return this.options.filter(option => {
      return this.searchFields.some(field => {
        const fieldValue = this.getNestedProperty(option, field);
        return fieldValue && fieldValue.toString().toLowerCase().includes(filterValue);
      });
    });
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }
}
