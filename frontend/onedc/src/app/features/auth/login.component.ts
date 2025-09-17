import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private authService = inject(AuthService);

  email = signal('admin@onedc.local');
  password = signal('password123');
  loading = signal(false);
  showPassword = false;

  submit() {
    if (!this.email() || !this.password()) {
      this.toastr.warning('Email and password required');
      return;
    }
    
    this.loading.set(true);
    this.authService.login({ email: this.email(), password: this.password() }).subscribe({
      next: (result) => {
        this.toastr.success(`Welcome, ${result.name}!`);
        const returnUrl = new URLSearchParams(window.location.search).get('returnUrl') || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastr.error(err.error?.message || 'Invalid credentials');
      }
    });
  }
}
