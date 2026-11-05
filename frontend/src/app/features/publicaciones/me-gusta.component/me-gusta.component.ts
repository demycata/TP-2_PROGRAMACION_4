import { Component, booleanAttribute, input, linkedSignal, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { PublicacionService } from '../../../services/publicacion.service';
import { EstadoMeGusta, Publicacion } from '../../../models/publicacion.model';
import { mensajeDeError } from '../../../shared/mensaje-error';

@Component({
  selector: 'app-me-gusta',
  templateUrl: './me-gusta.component.html',
  styleUrl: './me-gusta.component.css',
})
export class MeGustaComponent {
  publicacion = input.required<Publicacion>();
  conTexto = input(false, { transform: booleanAttribute });

  // arranca con lo que vino del listado y se vuelve a copiar si llega otra publicación
  meGusta = linkedSignal<EstadoMeGusta>(() => ({
    cantidadMeGusta: this.publicacion().cantidadMeGusta,
    meGustaDado: this.publicacion().meGustaDado,
  }));
  enviando = signal(false);
  error = signal<string | null>(null);

  constructor(private publicacionService: PublicacionService) {}

  alternar() {
    const id = this.publicacion()._id;
    const pedido = this.meGusta().meGustaDado
      ? this.publicacionService.quitarMeGusta(id)
      : this.publicacionService.darMeGusta(id);

    this.enviando.set(true);
    this.error.set(null);

    pedido.subscribe({
      next: (estado) => {
        this.meGusta.set(estado);
        this.enviando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(mensajeDeError(error));
        this.enviando.set(false);
      },
    });
  }
}
