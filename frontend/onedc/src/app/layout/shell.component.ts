import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreakpointObserver, Breakpoints, LayoutModule } from '@angular/cdk/layout';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { environment } from '../../environments/environment';
import { DevUserDialogComponent } from './widgets/dev-user-dialog/dev-user-dialog.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
 CommonModule, RouterModule, LayoutModule,
    MatToolbarModule, MatSidenavModule, MatListModule, MatIconModule,
    MatButtonModule, MatMenuModule, MatTooltipModule, MatBadgeModule, MatDividerModule,
    MatSnackBarModule, MatDialogModule
  ],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss']
})
export class ShellComponent implements OnInit {
  private bp = inject(BreakpointObserver);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

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
      this.snack.open('Set Dev User (GUID) from the header menu to call APIs', 'OK', { duration: 4000 });
    }
  }

  toggleTheme() {
    this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
  }

  openDevUserDialog() {
    this.dialog.open(DevUserDialogComponent, { width: '420px' })
      .afterClosed().subscribe(ok => {
        if (ok) location.reload();
      });
  }
}