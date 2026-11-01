import { Component, DestroyRef, ElementRef, output, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SesionService } from '../../../core/auth/sesion.service';
import { Publicacion, PublicacionService } from '../../../services/publicacion.service';
import { imagenValidator } from '../../../shared/validators/imagen.validators';
import { mensajeDeError } from '../../../shared/mensaje-error';

@Component({
  selector: 'app-nueva-publicacion',
  imports: [ReactiveFormsModule],
  templateUrl: './nueva-publicacion.component.html',
  styleUrl: './nueva-publicacion.component.css',
})
export class NuevaPublicacionComponent {
  creada = output<Publicacion>();

  enviado = signal(false);
  error = signal<string | null>(null);
  vistaPrevia = signal<string | null>(null);

  private selector = viewChild.required<ElementRef<HTMLInputElement>>('selector');

  form = new FormGroup({
    titulo: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    mensaje: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    imagen: new FormControl<File | null>(null, { validators: [imagenValidator()] }),
  });

  constructor(
    protected sesionService: SesionService,
    private publicacionService: PublicacionService,
    destroyRef: DestroyRef,
  ) {
    destroyRef.onDestroy(() => this.liberarVistaPrevia());
  }

  seleccionarImagen(evento: Event) {
    const archivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    const control = this.form.controls.imagen;
    control.setValue(archivo);
    control.markAsTouched();

    this.liberarVistaPrevia();
    this.vistaPrevia.set(archivo && control.valid ? URL.createObjectURL(archivo) : null);
  }

  quitarImagen() {
    this.selector().nativeElement.value = '';
    this.form.controls.imagen.setValue(null);
    this.liberarVistaPrevia();
    this.vistaPrevia.set(null);
  }

  publicar() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    this.enviado.set(true);
    this.error.set(null);

    const { titulo, mensaje, imagen } = this.form.getRawValue();
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('mensaje', mensaje);
    if (imagen) {
      formData.append('imagen', imagen);
    }

    this.publicacionService.crear(formData).subscribe({
      next: (publicacion) => {
        this.form.reset();
        this.quitarImagen();
        this.enviado.set(false);
        this.creada.emit(publicacion);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(mensajeDeError(error));
        this.enviado.set(false);
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
