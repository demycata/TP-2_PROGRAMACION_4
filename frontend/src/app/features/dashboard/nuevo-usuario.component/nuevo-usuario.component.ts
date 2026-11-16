import { Component, DestroyRef, computed, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UsuarioService } from '../../../services/usuario.service';
import { OpcionPerfil, PerfilUsuario } from '../../../models/usuario.model';
import { clavesCoincidenValidator } from '../../../shared/validators/usuario.validators';
import { imagenValidator } from '../../../shared/validators/imagen.validators';
import { mensajeDeError } from '../../../shared/mensaje-error';

@Component({
  selector: 'app-nuevo-usuario',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './nuevo-usuario.component.html',
  styleUrl: './nuevo-usuario.component.css',
})
export class NuevoUsuarioComponent {
  enviado = signal(false);
  error = signal<string | null>(null);
  vistaPrevia = signal<string | null>(null);

  perfiles: OpcionPerfil[] = [
    { valor: 'usuario', texto: 'Usuario', descripcion: 'Publica, comenta y da me gusta.' },
    {
      valor: 'administrador',
      texto: 'Administrador',
      descripcion: 'Además da de baja publicaciones y gestiona usuarios.',
    },
  ];

  controlPassword = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^(?=.*[A-Z])(?=.*\d).{8,}$/)],
  });

  form = new FormGroup({
    correo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    nombreUsuario: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: this.controlPassword,
    repetirPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, clavesCoincidenValidator(this.controlPassword)],
    }),
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
    perfil: new FormControl<PerfilUsuario>('usuario', { nonNullable: true }),
  });

  private password = toSignal(this.controlPassword.valueChanges, { initialValue: '' });

  reglas = computed(() => [
    { texto: '8+ caracteres', cumple: this.password().length >= 8 },
    { texto: '1 mayúscula', cumple: /[A-Z]/.test(this.password()) },
    { texto: '1 número', cumple: /\d/.test(this.password()) },
  ]);

  constructor(
    private usuarioService: UsuarioService,
    private router: Router,
    destroyRef: DestroyRef,
  ) {
    // El validador de "repetir" solo corre cuando cambia ese campo; si después se edita la contraseña, hay que revalidarlo.
    this.controlPassword.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.repetirPassword.updateValueAndValidity());

    destroyRef.onDestroy(() => this.liberarVistaPrevia());
  }

  seleccionarImagen(evento: Event) {
    const archivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    const control = this.form.controls.imagenPerfil;
    control.setValue(archivo);
    control.markAsTouched();

    this.liberarVistaPrevia();
    this.vistaPrevia.set(archivo && control.valid ? URL.createObjectURL(archivo) : null);
  }

  crear() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.enviado.set(true);
    this.error.set(null);

    const { repetirPassword, imagenPerfil, ...datos } = this.form.getRawValue();
    const formData = new FormData();
    Object.entries(datos).forEach(([campo, valor]) => formData.append(campo, valor));
    formData.append('imagenPerfil', imagenPerfil!);

    this.usuarioService.crear(formData).subscribe({
      next: (usuario) =>
        this.router.navigate(['/dashboard/usuarios'], {
          state: { aviso: `Usuario @${usuario.nombreUsuario} creado.` },
        }),
      error: (error: HttpErrorResponse) => {
        this.error.set(mensajeDeError(error));
        this.enviado.set(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
