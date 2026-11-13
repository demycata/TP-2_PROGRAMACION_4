import { Component, booleanAttribute, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SesionService } from '../../../core/auth/sesion.service';
import { ComentarioService } from '../../../services/comentario.service';
import { Comentario } from '../../../models/comentario.model';
import { TiempoRelativoPipe } from '../../../shared/pipes/tiempo-relativo.pipe';
import { mensajeDeError } from '../../../shared/mensaje-error';

@Component({
  selector: 'app-comentario',
  imports: [DatePipe, ReactiveFormsModule, TiempoRelativoPipe],
  templateUrl: './comentario.component.html',
  styleUrl: './comentario.component.css',
})
export class ComentarioComponent {
  comentario = input.required<Comentario>();
  deAutor = input(false, { transform: booleanAttribute });
  resumen = input(false, { transform: booleanAttribute });
  editado = output<Comentario>();
  eliminar = output<Comentario>();

  editando = signal(false);
  enviado = signal(false);
  error = signal<string | null>(null);

  form = new FormGroup({
    mensaje: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(1000)],
    }),
  });

  texto = toSignal(this.form.controls.mensaje.valueChanges, { initialValue: '' });
  esMio = computed(() => this.sesionService.usuario()?._id === this.comentario().autor._id);

  constructor(
    private sesionService: SesionService,
    private comentarioService: ComentarioService,
  ) {}

  editar() {
    this.form.setValue({ mensaje: this.comentario().mensaje });
    this.error.set(null);
    this.editando.set(true);
  }

  cancelar() {
    if (!this.enviado()) {
      this.editando.set(false);
    }
  }

  guardar() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.enviado()) {
      return;
    }

    const { mensaje } = this.form.getRawValue();
    if (mensaje === this.comentario().mensaje) {
      this.editando.set(false);
      return;
    }

    this.enviado.set(true);
    this.error.set(null);

    const { publicacion, _id } = this.comentario();
    this.comentarioService.editar(publicacion, _id, mensaje).subscribe({
      next: (comentario) => {
        this.editado.emit(comentario);
        this.editando.set(false);
        this.enviado.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(mensajeDeError(error));
        this.enviado.set(false);
      },
    });
  }
}
