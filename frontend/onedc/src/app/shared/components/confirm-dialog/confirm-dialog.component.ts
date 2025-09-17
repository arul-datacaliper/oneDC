import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule
  ],
  template: `
    <div mat-dialog-content class="text-center p-4">
      <div class="mb-3">
        <i class="bi bi-exclamation-triangle text-warning fs-1" *ngIf="data.type === 'warning'"></i>
        <i class="bi bi-exclamation-circle text-danger fs-1" *ngIf="data.type === 'danger'"></i>
        <i class="bi bi-info-circle text-info fs-1" *ngIf="data.type === 'info' || !data.type"></i>
      </div>
      <h4 class="mb-3">{{ data.title }}</h4>
      <p class="text-muted">{{ data.message }}</p>
    </div>
    <div mat-dialog-actions class="justify-content-center p-3 border-top">
      <button mat-button (click)="onCancel()" class="me-2">
        {{ data.cancelText || 'Cancel' }}
      </button>
      <button 
        mat-flat-button 
        [color]="data.type === 'danger' ? 'warn' : 'primary'" 
        (click)="onConfirm()">
        {{ data.confirmText || 'Confirm' }}
      </button>
    </div>
  `,
  styles: [`
    .fs-1 {
      font-size: 3rem;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
