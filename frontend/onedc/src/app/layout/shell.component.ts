import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreakpointObserver, Breakpoints, LayoutModule } from '@angular/cdk/layout';

// Keep only essential Material modules for dialog functionality
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// Bootstrap Toast Integration
import { ToastrService } from 'ngx-toastr';

import { environment } from '../../environments/environment';
import { DevUserDialogComponent } from './widgets/dev-user-dialog/dev-user-dialog.component';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    LayoutModule,
    MatDialogModule
  ],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent implements OnInit {
  private bp = inject(BreakpointObserver);
  private toastr = inject(ToastrService);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);

  isHandset = signal(false);
  sidenavOpened = signal(true);
  envLabel = environment.production ? 'PROD' : 'DEV';

  readonly initial = (document.documentElement.dataset['theme'] as 'light' | 'dark' | undefined) ?? 'light';

  theme = signal<'light' | 'dark'>(this.initial);

  constructor() {
    // responsive watcher
    this.bp.observe([Breakpoints.Handset]).subscribe(s => {
      this.isHandset.set(s.matches);
      this.sidenavOpened.set(!s.matches);
    });

    // react to theme changes
    effect(() => {
   document.documentElement.dataset['theme'] = this.theme();
    });
  }

  ngOnInit(): void {
    const devId = localStorage.getItem('debugUserId');
    if (!devId) {
      this.toastr.info('Set Dev User (GUID) from the header menu to call APIs', 'Info', { timeOut: 4000 });
    }
  }

  toggleTheme() {
    this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
  }

  // Check if current user is admin
  isAdmin(): boolean {
    const isAdmin = this.authService.isAdmin();
    console.log('Shell component - isAdmin():', isAdmin);
    return isAdmin;
  }

  // Check if current user can approve (admin or approver role)
  canApprove(): boolean {
    return this.authService.canApprove();
  }

  openDevUserDialog() {
    this.dialog.open(DevUserDialogComponent, { width: '420px' })
      .afterClosed().subscribe(ok => {
        if (ok) location.reload();
      });
  }

  logout() {
    this.authService.logout();
    window.location.href = '/login';
  }
}