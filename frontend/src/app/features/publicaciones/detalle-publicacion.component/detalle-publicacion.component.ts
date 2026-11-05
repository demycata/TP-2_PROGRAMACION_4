import { Component, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicacionService } from '../../../services/publicacion.service';
import { Publicacion } from '../../../models/publicacion.model';
import { MeGustaComponent } from '../me-gusta.component/me-gusta.component';
import { CopiarLinkDirective } from '../../../shared/directives/copiar-link.directive';
import { HashCortoPipe } from '../../../shared/pipes/hash-corto.pipe';
import { mensajeDeError } from '../../../shared/mensaje-error';

@Component({
  selector: 'app-detalle-publicacion',
  imports: [DatePipe, RouterLink, MeGustaComponent, CopiarLinkDirective, HashCortoPipe],
  templateUrl: './detalle-publicacion.component.html',
  styleUrl: './detalle-publicacion.component.css',
})
export class DetallePublicacionComponent {
  publicacion = signal<Publicacion | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  constructor(
    ruta: ActivatedRoute,
    private publicacionService: PublicacionService,
  ) {
    ruta.paramMap.subscribe((parametros) => this.cargar(parametros.get('id')!));
  }

  private cargar(id: string) {
    this.cargando.set(true);
    this.error.set(null);

    this.publicacionService.obtener(id).subscribe({
      next: (publicacion) => {
        this.publicacion.set(publicacion);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(mensajeDeError(error));
        this.cargando.set(false);
      },
    });
  }
}
