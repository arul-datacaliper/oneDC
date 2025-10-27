import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationDialogService } from '../../core/services/confirmation-dialog.service';

@Component({
  selector: 'app-confirmation-dialog-examples',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container mt-4">
      <h3>Confirmation Dialog Examples</h3>
      <p class="text-muted">Click the buttons below to see different types of confirmation dialogs</p>
      
      <div class="row">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <h5>Basic Confirmations</h5>
            </div>
            <div class="card-body">
              <button class="btn btn-primary mb-2 me-2" (click)="showBasicConfirm()">
                Basic Confirm
              </button>
              <button class="btn btn-info mb-2 me-2" (click)="showInfoDialog()">
                Info Dialog
              </button>
              <button class="btn btn-warning mb-2 me-2" (click)="showWarningDialog()">
                Warning Dialog
              </button>
              <button class="btn btn-danger mb-2 me-2" (click)="showDeleteConfirm()">
                Delete Confirm
              </button>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <h5>Advanced Examples</h5>
            </div>
            <div class="card-body">
              <button class="btn btn-warning mb-2 me-2" (click)="showLeaveBalanceDialog()">
                Leave Balance Warning
              </button>
              <button class="btn btn-secondary mb-2 me-2" (click)="showLargeDialog()">
                Large Dialog
              </button>
              <button class="btn btn-success mb-2 me-2" (click)="showSuccessDialog()">
                Success Dialog
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4">
        <h5>Last Action Result:</h5>
        <div class="alert" [ngClass]="getAlertClass()" *ngIf="lastResult !== null">
          {{ lastResult ? 'User clicked OK/Confirm' : 'User clicked Cancel' }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
    }
  `]
})
export class ConfirmationDialogExamplesComponent {
  lastResult: boolean | null = null;

  constructor(private confirmationDialogService: ConfirmationDialogService) {}

  async showBasicConfirm() {
    this.lastResult = await this.confirmationDialogService.confirm(
      'Confirm Action',
      'Are you sure you want to perform this action?',
      'Yes, Continue',
      'Cancel'
    );
  }

  async showInfoDialog() {
    this.lastResult = await this.confirmationDialogService.showInfo(
      'Information',
      'This is an informational message with some details.',
      ['Detail 1: Some important information', 'Detail 2: Additional context']
    );
  }

  async showWarningDialog() {
    this.lastResult = await this.confirmationDialogService.open({
      title: 'Warning',
      message: 'This action may have consequences. Please review the details below.',
      details: ['Action will be irreversible', 'All data will be processed', 'Operation may take time'],
      confirmText: 'I Understand',
      cancelText: 'Go Back',
      type: 'warning'
    });
  }

  async showDeleteConfirm() {
    this.lastResult = await this.confirmationDialogService.confirmDelete('user account');
  }

  async showLeaveBalanceDialog() {
    this.lastResult = await this.confirmationDialogService.confirmLeaveRequest(27, 25);
  }

  async showLargeDialog() {
    this.lastResult = await this.confirmationDialogService.open({
      title: 'Large Dialog Example',
      message: 'This is a large dialog with extensive content and details.',
      details: [
        'First important point to consider',
        'Second critical aspect of this operation',
        'Third consideration that needs attention',
        'Fourth detail that requires review',
        'Fifth and final point to understand'
      ],
      confirmText: 'Proceed Anyway',
      cancelText: 'Review Again',
      type: 'warning',
      size: 'lg'
    });
  }

  async showSuccessDialog() {
    this.lastResult = await this.confirmationDialogService.open({
      title: 'Operation Successful',
      message: 'Your operation has been completed successfully!',
      details: ['All data has been saved', 'Email confirmation sent', 'Process completed at ' + new Date().toLocaleString()],
      cancelText: 'Great!',
      type: 'success'
    });
  }

  getAlertClass(): string {
    return this.lastResult ? 'alert-success' : 'alert-info';
  }
}
