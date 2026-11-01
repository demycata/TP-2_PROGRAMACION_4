import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PublicacionService } from '../../../services/publicacion.service';
import { EstadoMeGusta, Publicacion } from '../../../models/publicacion.model';
import { SesionService } from '../../../core/auth/sesion.service';
import { TiempoRelativoPipe } from '../../../shared/pipes/tiempo-relativo.pipe';
import { mensajeDeError } from '../../../shared/mensaje-error';

@Component({
  selector: 'app-publicacion',
  imports: [DatePipe, TiempoRelativoPipe],
  templateUrl: './publicacion.component.html',
  styleUrl: './publicacion.component.css',
})
export class PublicacionComponent {
  publicacion = input.required<Publicacion>();
  eliminar = output<Publicacion>();

  esMia = computed(() => this.sesionService.usuario()?._id === this.publicacion().autor._id);

  // arranca con lo que vino del listado y se vuelve a copiar si llega otra publicación
  meGusta = linkedSignal<EstadoMeGusta>(() => ({
    cantidadMeGusta: this.publicacion().cantidadMeGusta,
    meGustaDado: this.publicacion().meGustaDado,
  }));
  enviandoMeGusta = signal(false);
  error = signal<string | null>(null);

  constructor(
    private publicacionService: PublicacionService,
    private sesionService: SesionService,
  ) {}

  alternarMeGusta() {
    const id = this.publicacion()._id;
    const pedido = this.meGusta().meGustaDado
      ? this.publicacionService.quitarMeGusta(id)
      : this.publicacionService.darMeGusta(id);

    this.enviandoMeGusta.set(true);
    this.error.set(null);

    pedido.subscribe({
      next: (estado) => {
        this.meGusta.set(estado);
        this.enviandoMeGusta.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(mensajeDeError(error));
        this.enviandoMeGusta.set(false);
      },
    });
  }
}
