import { Component, DestroyRef, computed, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { PublicacionService } from '../../../services/publicacion.service';
import { OpcionOrden, OrdenPublicaciones, Publicacion } from '../../../models/publicacion.model';
import { NuevaPublicacionComponent } from '../nueva-publicacion.component/nueva-publicacion.component';
import { PublicacionComponent } from '../publicacion.component/publicacion.component';
import { ModalComponent } from '../../../shared/modal.component/modal.component';
import { AlAparecerDirective } from '../../../shared/directives/al-aparecer.directive';
import { mensajeDeError } from '../../../shared/mensaje-error';

const POR_TANDA = 5;

@Component({
  selector: 'app-publicaciones',
  imports: [NuevaPublicacionComponent, PublicacionComponent, ModalComponent, AlAparecerDirective],
  templateUrl: './publicaciones.component.html',
  styleUrl: './publicaciones.component.css',
})
export class PublicacionesComponent {
  ordenes: OpcionOrden[] = [
    { valor: 'fecha', texto: 'Más recientes' },
    { valor: 'meGusta', texto: 'Más me gusta' },
  ];

  orden = signal<OrdenPublicaciones>('fecha');
  publicaciones = signal<Publicacion[]>([]);
  total = signal(0);
  cargando = signal(false);
  error = signal<string | null>(null);
  aviso = signal<string | null>(null);
  aEliminar = signal<Publicacion | null>(null);
  eliminando = signal(false);
  errorEliminar = signal<string | null>(null);

  hayMas = computed(() => this.publicaciones().length < this.total());

  private pedido?: Subscription;
  private temporizadorAviso?: ReturnType<typeof setTimeout>;

  constructor(
    private publicacionService: PublicacionService,
    destroyRef: DestroyRef,
  ) {
    this.reiniciar();
    destroyRef.onDestroy(() => clearTimeout(this.temporizadorAviso));
  }

  ordenarPor(orden: OrdenPublicaciones) {
    if (orden === this.orden()) {
      return;
    }
    this.orden.set(orden);
    this.reiniciar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cargarMas() {
    if (this.cargando()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    this.pedido = this.publicacionService
      .listar({ orden: this.orden(), offset: this.publicaciones().length, limit: POR_TANDA })
      .subscribe({
        next: ({ publicaciones, total }) => {
          // si alguien publicó mientras tanto, la lista se corre y puede volver una que ya está
          const yaEstan = new Set(this.publicaciones().map((p) => p._id));
          this.publicaciones.update((actuales) => [
            ...actuales,
            ...publicaciones.filter((p) => !yaEstan.has(p._id)),
          ]);
          this.total.set(total);
          this.cargando.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.error.set(mensajeDeError(error));
          this.cargando.set(false);
        },
      });
  }

  publicada(publicacion: Publicacion) {
    this.mostrarAviso('Publicación creada.');
    if (this.orden() === 'fecha') {
      this.publicaciones.update((actuales) => [publicacion, ...actuales]);
      this.total.update((total) => total + 1);
    } else {
      this.reiniciar();
    }
  }

  pedirConfirmacion(publicacion: Publicacion) {
    this.errorEliminar.set(null);
    this.aEliminar.set(publicacion);
  }

  cancelarEliminacion() {
    if (!this.eliminando()) {
      this.aEliminar.set(null);
    }
  }

  confirmarEliminacion(publicacion: Publicacion) {
    this.eliminando.set(true);
    this.errorEliminar.set(null);

    this.publicacionService.eliminar(publicacion._id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.aEliminar.set(null);
        this.publicaciones.update((actuales) => actuales.filter((p) => p._id !== publicacion._id));
        this.total.update((total) => total - 1);
        this.mostrarAviso('Publicación eliminada.');
      },
      error: (error: HttpErrorResponse) => {
        this.errorEliminar.set(mensajeDeError(error));
        this.eliminando.set(false);
      },
    });
  }

  private reiniciar() {
    // si quedó un pedido del orden anterior en camino, se cancela para que no se mezcle
    this.pedido?.unsubscribe();
    this.cargando.set(false);
    this.publicaciones.set([]);
    this.total.set(0);
    this.cargarMas();
  }

  private mostrarAviso(mensaje: string) {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(mensaje);
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), 3000);
  }
}
