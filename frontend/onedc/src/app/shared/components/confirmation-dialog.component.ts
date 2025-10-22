import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  details?: string[];
  showDetailsAsAlert?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop fade show" *ngIf="visible" (click)="onCancel()"></div>
    <div class="modal fade show" [style.display]="visible ? 'block' : 'none'" tabindex="-1" role="dialog">
      <div [class]="getModalDialogClass()" role="document" (click)="$event.stopPropagation()">
        <div class="modal-content">
          <div class="modal-header" [class]="getHeaderClass()">
            <h5 class="modal-title d-flex align-items-center">
              <i [class]="getIconClass()" class="me-2"></i>
              {{ data.title }}
            </h5>
            <button type="button" class="btn-close btn-close-white" (click)="onCancel()"></button>
          </div>
          <div class="modal-body">
            <p class="mb-3">{{ data.message }}</p>
            <div *ngIf="data.details && data.details.length > 0" [class]="getDetailsClass()">
              <strong *ngIf="data.showDetailsAsAlert !== false">Details:</strong>
              <ul class="mt-2 mb-0" *ngIf="data.showDetailsAsAlert !== false">
                <li *ngFor="let detail of data.details">{{ detail }}</li>
              </ul>
              <div *ngIf="data.showDetailsAsAlert === false" class="details-simple">
                <div *ngFor="let detail of data.details" class="detail-item">
                  {{ detail }}
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" (click)="onCancel()">
              {{ data.cancelText || 'Cancel' }}
            </button>
            <button 
              type="button" 
              [class]="getConfirmButtonClass()" 
              (click)="onConfirm()"
              *ngIf="data.type !== 'info'">
              {{ data.confirmText || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal {
      z-index: 1055;
    }
    .modal-backdrop {
      z-index: 1050;
    }
    .modal-header.bg-danger {
      background-color: #dc3545 !important;
      color: white;
    }
    .modal-header.bg-warning {
      background-color: #ffc107 !important;
      color: #212529;
    }
    .modal-header.bg-info {
      background-color: #0dcaf0 !important;
      color: #212529;
    }
    .modal-header.bg-success {
      background-color: #198754 !important;
      color: white;
    }
    .details-simple .detail-item {
      padding: 0.25rem 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .details-simple .detail-item:last-child {
      border-bottom: none;
    }
  `]
})
export class ConfirmationDialogComponent {
  @Input() visible: boolean = false;
  @Input() data: ConfirmationDialogData = {
    title: '',
    message: ''
  };
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm() {
    this.confirmed.emit();
  }

  onCancel() {
    this.cancelled.emit();
  }

  getIconClass(): string {
    switch (this.data.type) {
      case 'danger': return 'fas fa-exclamation-triangle';
      case 'warning': return 'fas fa-exclamation-circle';
      case 'info': return 'fas fa-info-circle';
      case 'success': return 'fas fa-check-circle';
      default: return 'fas fa-question-circle';
    }
  }

  getConfirmButtonClass(): string {
    switch (this.data.type) {
      case 'danger': return 'btn btn-danger';
      case 'warning': return 'btn btn-warning';
      case 'success': return 'btn btn-success';
      default: return 'btn btn-primary';
    }
  }

  getModalDialogClass(): string {
    const sizeClass = this.getModalSizeClass();
    return `modal-dialog modal-dialog-centered ${sizeClass}`;
  }

  getModalSizeClass(): string {
    switch (this.data.size) {
      case 'sm': return 'modal-sm';
      case 'lg': return 'modal-lg';
      case 'xl': return 'modal-xl';
      default: return '';
    }
  }

  getHeaderClass(): string {
    switch (this.data.type) {
      case 'danger': return 'bg-danger';
      case 'warning': return 'bg-warning';
      case 'info': return 'bg-info';
      case 'success': return 'bg-success';
      default: return '';
    }
  }

  getDetailsClass(): string {
    if (this.data.showDetailsAsAlert === false) {
      return 'details-simple border rounded p-3 bg-light';
    }
    
    switch (this.data.type) {
      case 'danger': return 'alert alert-danger';
      case 'warning': return 'alert alert-warning';
      case 'info': return 'alert alert-info';
      case 'success': return 'alert alert-success';
      default: return 'alert alert-light';
    }
  }
}
