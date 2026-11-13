import { Component, OnInit, booleanAttribute, computed, input, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ComentarioService } from '../../../services/comentario.service';
import { Comentario } from '../../../models/comentario.model';
import { Publicacion } from '../../../models/publicacion.model';
import { ComentarioComponent } from '../comentario.component/comentario.component';
import { ModalComponent } from '../../../shared/modal.component/modal.component';
import { mensajeDeError } from '../../../shared/mensaje-error';

@Component({
  selector: 'app-comentarios',
  imports: [ReactiveFormsModule, RouterLink, ComentarioComponent, ModalComponent],
  templateUrl: './comentarios.component.html',
  styleUrl: './comentarios.component.css',
})
export class ComentariosComponent implements OnInit {
  publicacion = input.required<Publicacion>();
  // en Mi Perfil: los 3 más recientes, sin formulario ni "Cargar más"
  resumen = input(false, { transform: booleanAttribute });

  comentarios = signal<Comentario[]>([]);
  total = signal(0);
  cargando = signal(true);
  errorCarga = signal<string | null>(null);
  enviado = signal(false);
  error = signal<string | null>(null);
  aEliminar = signal<Comentario | null>(null);
  eliminando = signal(false);
  errorEliminar = signal<string | null>(null);

  restantes = computed(() => this.total() - this.comentarios().length);

  form = new FormGroup({
    mensaje: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(1000)],
    }),
  });

  texto = toSignal(this.form.controls.mensaje.valueChanges, { initialValue: '' });

  constructor(private comentarioService: ComentarioService) {}

  ngOnInit() {
    this.cargar();
  }

  // offset = los que ya están en pantalla; si alguien comentó en el medio, el repetido se descarta
  cargar() {
    this.cargando.set(true);
    this.errorCarga.set(null);

    const filtros = { offset: this.comentarios().length, limit: this.resumen() ? 3 : 5 };
    this.comentarioService.listar(this.publicacion()._id, filtros).subscribe({
      next: ({ comentarios, total }) => {
        const vistos = new Set(this.comentarios().map((comentario) => comentario._id));
        this.comentarios.update((actuales) => [
          ...actuales,
          ...comentarios.filter((comentario) => !vistos.has(comentario._id)),
        ]);
        this.total.set(total);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorCarga.set(mensajeDeError(error));
        this.cargando.set(false);
      },
    });
  }

  comentar() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.enviado()) {
      return;
    }

    this.enviado.set(true);
    this.error.set(null);

    this.comentarioService.crear(this.publicacion()._id, this.form.getRawValue().mensaje).subscribe({
      next: (comentario) => {
        this.comentarios.update((actuales) => [comentario, ...actuales]);
        this.total.update((total) => total + 1);
        this.form.reset();
        this.enviado.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(mensajeDeError(error));
        this.enviado.set(false);
      },
    });
  }

  reemplazar(editado: Comentario) {
    this.comentarios.update((actuales) =>
      actuales.map((comentario) => (comentario._id === editado._id ? editado : comentario)),
    );
  }

  pedirEliminacion(comentario: Comentario) {
    this.errorEliminar.set(null);
    this.aEliminar.set(comentario);
  }

  cancelarEliminacion() {
    if (!this.eliminando()) {
      this.aEliminar.set(null);
    }
  }

  confirmarEliminacion(comentario: Comentario) {
    this.eliminando.set(true);
    this.errorEliminar.set(null);

    this.comentarioService.eliminar(comentario.publicacion, comentario._id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.aEliminar.set(null);
        this.comentarios.update((actuales) => actuales.filter((c) => c._id !== comentario._id));
        this.total.update((total) => total - 1);
      },
      error: (error: HttpErrorResponse) => {
        this.errorEliminar.set(mensajeDeError(error));
        this.eliminando.set(false);
      },
    });
  }
}
