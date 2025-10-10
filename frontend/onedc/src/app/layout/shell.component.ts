import { Component, effect, inject, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreakpointObserver, Breakpoints, LayoutModule } from '@angular/cdk/layout';

// Keep only essential Material modules for dialog functionality
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// Bootstrap Toast Integration
import { ToastrService } from 'ngx-toastr';

import { environment } from '../../environments/environment';
import { AuthService } from '../core/services/auth.service';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';

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

  // State management
  sidenavOpened = signal(false);
  theme = signal<'light' | 'dark'>('light');
  isOnboardingComplete = signal(false);
  userDropdownOpen = signal(false); // Add dropdown state management
  isHandset = signal(false); // Add handset detection

  envLabel = environment.production ? 'PROD' : 'DEV';

  readonly initial = (document.documentElement.dataset['theme'] as 'light' | 'dark' | undefined) ?? 'light';

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
    // Initialize onboarding status
    this.authService.initializeOnboardingStatus();
    
    // Subscribe to onboarding status changes
    this.authService.onboardingComplete$.subscribe(isComplete => {
      this.isOnboardingComplete.set(isComplete);
    });
    
    // Set initial value
    this.isOnboardingComplete.set(this.authService.isOnboardingComplete());

    // Debug helper (remove in production)
    if (!environment.production) {
      (window as any).debugAuth = () => this.authService.debugToken();
      console.log('Debug: Type "debugAuth()" in console to inspect token');
    }
  }

  // Toggle user dropdown
  toggleUserDropdown() {
    this.userDropdownOpen.set(!this.userDropdownOpen());
  }

  // Close dropdown when clicking outside
  closeUserDropdown() {
    this.userDropdownOpen.set(false);
  }

  // Get current user information
  currentUser() {
    try {
      return this.authService.getCurrentUser();
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Check if current user is admin
  isAdmin(): boolean {
    try {
      return this.authService.isAdmin();
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Check if current user can approve (admin or approver role)
  canApprove(): boolean {
    try {
      return this.authService.canApprove();
    } catch (error) {
      console.error('Error checking approval permissions:', error);
      return false;
    }
  }

  logout() {
    // Show confirmation dialog
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Logout',
        message: 'Are you sure you want to sign out? You will need to log in again to access the application.',
        confirmText: 'Sign Out',
        cancelText: 'Cancel',
        type: 'warning'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.performLogout();
      }
    });
  }

  // Keyboard shortcut for logout (Ctrl+Shift+L)
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.ctrlKey && event.shiftKey && event.key === 'L') {
      event.preventDefault();
      this.logout();
    }
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.dropdown');
    if (!dropdown && this.userDropdownOpen()) {
      this.closeUserDropdown();
    }
  }

  private performLogout() {
    try {
      // Show loading state or confirmation if needed
      this.authService.logout();
      
      // Show success message
      this.toastr.success('You have been logged out successfully', 'Logged Out');
      
      // Small delay to allow toast to show before redirect
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } catch (error) {
      console.error('Error during logout:', error);
      this.toastr.error('An error occurred during logout', 'Error');
      
      // Still redirect to login even if there's an error
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }
  }
}