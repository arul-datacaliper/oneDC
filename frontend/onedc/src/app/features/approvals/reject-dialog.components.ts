import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  selector: 'app-reject-dialog',
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Reject entry</h2>
    <div mat-dialog-content>
      <p>Please provide a reason:</p>
      <mat-form-field appearance="outline" class="w-100">
        <mat-label>Reason</mat-label>
        <textarea matInput [(ngModel)]="reason" rows="3"></textarea>
      </mat-form-field>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="close()">Cancel</button>
      <button mat-flat-button color="warn" (click)="ok()" [disabled]="!reason.trim()">Reject</button>
    </div>
  `,
  styles: [`.w-100{width:100%}`]
})
export class RejectDialogComponent {
  private ref = inject(MatDialogRef<RejectDialogComponent>);
  reason = '';
  close(){ this.ref.close(); }
  ok(){ this.ref.close(this.reason.trim()); }
}
