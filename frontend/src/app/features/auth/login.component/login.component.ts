import { Component, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { SesionService } from '../../../core/auth/sesion.service';
import { AuthLayoutComponent } from '../../../shared/auth-layout.component/auth-layout.component';
import { mensajeDeError } from '../../../shared/mensaje-error';
import { Problema } from '../../../models/navegacion.model';

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
    private sesionService: SesionService,
    private router: Router,
  ) {
    const estado = this.router.currentNavigation()?.extras.state;
    this.exito.set(estado?.['mensaje'] ?? null);
    this.error.set(estado?.['error'] ?? null);
  }

  get problemas(): Problema[] {
    const { nombreUsuario, password } = this.form.controls;
    const error = this.error();
    return [
      ...(nombreUsuario.touched && nombreUsuario.invalid
        ? [{ texto: 'El nombre de usuario es obligatorio', campo: 'usuario' }]
        : []),
      ...(password.touched && password.invalid
        ? [{ texto: 'La contraseña es obligatoria', campo: 'contraseña' }]
        : []),
      ...(error ? [{ texto: error, campo: 'login' }] : []),
    ];
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
      next: ({ token, usuario }) => {
        this.sesionService.iniciar(token, usuario);
        this.exito.set('credenciales válidas · ingresando…');
        setTimeout(() => this.router.navigate(['/publicaciones']), 800);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(mensajeDeError(error));
        this.enviado.set(false);
      },
    });
  }
}
