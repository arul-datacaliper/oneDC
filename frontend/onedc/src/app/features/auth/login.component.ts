import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

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

  email = signal('');
  password = signal('');
  loading = signal(false);

  submit() {
    if (!this.email() || !this.password()) {
      this.toastr.warning('Email and password required');
      return;
    }
    this.loading.set(true);
    // Simulate login success; store dummy token
    setTimeout(() => {
      localStorage.setItem('auth_token', 'dev-token');
      this.toastr.success('Logged in');
      const returnUrl = new URLSearchParams(window.location.search).get('returnUrl') || '/dashboard';
      this.router.navigateByUrl(returnUrl);
    }, 600);
  }
}
