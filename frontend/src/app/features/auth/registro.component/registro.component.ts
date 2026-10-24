import { Component, DestroyRef, computed, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AuthLayoutComponent } from '../../../shared/auth-layout.component/auth-layout.component';
import { clavesCoincidenValidator } from '../../../shared/validators/usuario.validators';
import { imagenValidator } from '../../../shared/validators/imagen.validators';
import { mensajeDeError } from '../../../shared/mensaje-error';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css',
})
export class RegistroComponent {
  enviado = signal(false);
  error = signal<string | null>(null);
  vistaPrevia = signal<string | null>(null);
  paso = signal<1 | 2>(1);

  controlPassword = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^(?=.*[A-Z])(?=.*\d).{8,}$/)],
  });

  credenciales = new FormGroup({
    correo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    nombreUsuario: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: this.controlPassword,
    repetirPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, clavesCoincidenValidator(this.controlPassword)],
    }),
  });

  datos = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    apellido: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    fechaNacimiento: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    descripcion: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5)],
    }),
    imagenPerfil: new FormControl<File | null>(null, {
      validators: [Validators.required, imagenValidator()],
    }),
  });

  form = new FormGroup({ credenciales: this.credenciales, datos: this.datos });

  private password = toSignal(this.controlPassword.valueChanges, { initialValue: '' });

  reglas = computed(() => [
    { texto: '8+ caracteres', cumple: this.password().length >= 8 },
    { texto: '1 mayúscula', cumple: /[A-Z]/.test(this.password()) },
    { texto: '1 número', cumple: /\d/.test(this.password()) },
  ]);

  constructor(
    private authService: AuthService,
    private router: Router,
    destroyRef: DestroyRef,
  ) {
    // El validador de "repetir" solo corre cuando cambia ese campo; si después se edita la contraseña, hay que revalidarlo.
    this.controlPassword.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.credenciales.controls.repetirPassword.updateValueAndValidity());

    destroyRef.onDestroy(() => this.liberarVistaPrevia());
  }

  siguiente() {
    this.credenciales.markAllAsTouched();
    if (this.credenciales.invalid) {
      return;
    }
    this.error.set(null);
    this.paso.set(2);
  }

  volver() {
    this.paso.set(1);
  }

  seleccionarImagen(evento: Event) {
    const archivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    const control = this.datos.controls.imagenPerfil;
    control.setValue(archivo);
    control.markAsTouched();

    this.liberarVistaPrevia();
    this.vistaPrevia.set(archivo && control.valid ? URL.createObjectURL(archivo) : null);
  }

  registrar() {
    if (this.paso() === 1) {
      this.siguiente();
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.enviado.set(true);
    this.error.set(null);

    const { repetirPassword, ...credenciales } = this.credenciales.getRawValue();
    const { imagenPerfil, ...datos } = this.datos.getRawValue();
    const formData = new FormData();
    Object.entries({ ...credenciales, ...datos }).forEach(([campo, valor]) =>
      formData.append(campo, valor),
    );
    formData.append('imagenPerfil', imagenPerfil!);

    this.authService.registro(formData).subscribe({
      next: () =>
        this.router.navigate(['/login'], {
          state: { mensaje: 'Cuenta creada, ya podés ingresar.' },
        }),
      error: (error: HttpErrorResponse) => {
        this.error.set(mensajeDeError(error));
        this.enviado.set(false);
        if (error.status === 409) {
          this.paso.set(1);
        }
      },
    });
  }

  private liberarVistaPrevia() {
    const url = this.vistaPrevia();
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}
