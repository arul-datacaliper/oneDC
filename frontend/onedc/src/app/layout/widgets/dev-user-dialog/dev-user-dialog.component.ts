import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-dev-user-dialog',
  standalone: true,
  imports: [ CommonModule,FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule],
  templateUrl: './dev-user-dialog.component.html',
  styleUrl: './dev-user-dialog.component.scss'
})
export class DevUserDialogComponent {
 private ref = inject(MatDialogRef<DevUserDialogComponent>);
  guid = localStorage.getItem('debugUserId') ?? '';

  isGuid(v: string) {
    return /^[0-9a-fA-F-]{36}$/.test(v);
  }

  save() {
    if (this.isGuid(this.guid)) {
      localStorage.setItem('debugUserId', this.guid);
      this.ref.close(true);
    }
  }
}
