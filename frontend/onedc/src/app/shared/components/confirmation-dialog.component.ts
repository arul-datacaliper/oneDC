import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  details?: string[];
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop fade show" *ngIf="visible" (click)="onCancel()"></div>
    <div class="modal fade show" [style.display]="visible ? 'block' : 'none'" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-dialog-centered" role="document" (click)="$event.stopPropagation()">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i [class]="getIconClass()" class="me-2"></i>
              {{ data.title }}
            </h5>
            <button type="button" class="btn-close" (click)="onCancel()"></button>
          </div>
          <div class="modal-body">
            <p class="mb-3">{{ data.message }}</p>
            <div *ngIf="data.details && data.details.length > 0" class="alert alert-light">
              <strong>Details:</strong>
              <ul class="mt-2 mb-0">
                <li *ngFor="let detail of data.details">{{ detail }}</li>
              </ul>
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
      case 'danger': return 'fas fa-exclamation-triangle text-danger';
      case 'warning': return 'fas fa-exclamation-circle text-warning';
      case 'info': return 'fas fa-info-circle text-info';
      default: return 'fas fa-question-circle text-primary';
    }
  }

  getConfirmButtonClass(): string {
    switch (this.data.type) {
      case 'danger': return 'btn btn-danger';
      case 'warning': return 'btn btn-warning';
      default: return 'btn btn-primary';
    }
  }
}
