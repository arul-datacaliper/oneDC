import { Injectable, ComponentRef, ViewContainerRef, ApplicationRef, Injector, createComponent } from '@angular/core';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/components/confirmation-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class ConfirmationDialogService {
  private dialogRef: ComponentRef<ConfirmationDialogComponent> | null = null;

  constructor(
    private appRef: ApplicationRef,
    private injector: Injector
  ) {}

  open(data: ConfirmationDialogData): Promise<boolean> {
    return new Promise((resolve) => {
      // Close any existing dialog
      this.close();

      // Create the component
      this.dialogRef = createComponent(ConfirmationDialogComponent, {
        environmentInjector: this.appRef.injector,
        elementInjector: this.injector
      });

      // Set the input data
      this.dialogRef.setInput('data', data);
      this.dialogRef.setInput('visible', true);

      // Subscribe to events
      this.dialogRef.instance.confirmed.subscribe(() => {
        resolve(true);
        this.close();
      });

      this.dialogRef.instance.cancelled.subscribe(() => {
        resolve(false);
        this.close();
      });

      // Attach to the DOM
      document.body.appendChild(this.dialogRef.location.nativeElement);

      // Trigger change detection
      this.appRef.attachView(this.dialogRef.hostView);
    });
  }

  close(): void {
    if (this.dialogRef) {
      this.appRef.detachView(this.dialogRef.hostView);
      this.dialogRef.destroy();
      this.dialogRef = null;
    }
  }

  // Convenience methods for common dialog types
  confirm(title: string, message: string, confirmText?: string, cancelText?: string): Promise<boolean> {
    return this.open({
      title,
      message,
      confirmText,
      cancelText,
      type: 'warning'
    });
  }

  confirmDelete(itemName?: string): Promise<boolean> {
    return this.open({
      title: 'Confirm Deletion',
      message: `Are you sure you want to delete ${itemName || 'this item'}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
  }

  confirmLeaveRequest(requestedDays: number, availableDays: number): Promise<boolean> {
    const shortfall = requestedDays - availableDays;
    return this.open({
      title: 'Leave Balance Warning',
      message: 'This request exceeds your available leave balance. Do you want to proceed?',
      details: [
        `Requested: ${requestedDays} days`,
        `Available: ${availableDays} days`,
        `Shortfall: ${shortfall} days`
      ],
      confirmText: 'OK',
      cancelText: 'Cancel',
      type: 'warning',
      showDetailsAsAlert: false,
      size: 'md'
    });
  }

  showInfo(title: string, message: string, details?: string[]): Promise<boolean> {
    return this.open({
      title,
      message,
      details,
      cancelText: 'OK',
      type: 'info'
    });
  }
}
