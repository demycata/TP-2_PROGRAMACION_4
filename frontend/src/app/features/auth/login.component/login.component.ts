import { Component, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AuthLayoutComponent } from '../../../shared/auth-layout.component/auth-layout.component';
import { mensajeDeError } from '../../../shared/mensaje-error';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  enviado = signal(false);
  error = signal<string | null>(null);
  exito = signal<string | null>(null);
  mostrarPassword = signal(false);

  form = new FormGroup({
    nombreUsuario: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
    this.exito.set(this.router.currentNavigation()?.extras.state?.['mensaje'] ?? null);
  }

  alternarPassword() {
    this.mostrarPassword.update((valor) => !valor);
  }

  ingresar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.enviado.set(true);
    this.error.set(null);
    this.exito.set(null);

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.exito.set('Credenciales válidas. Ingresando…');
        setTimeout(() => this.router.navigate(['/publicaciones']), 800);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(mensajeDeError(error));
        this.enviado.set(false);
      },
    });
  }
}
