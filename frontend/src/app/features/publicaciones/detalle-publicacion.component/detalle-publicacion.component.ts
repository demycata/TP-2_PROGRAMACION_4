import { Component, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PublicacionService } from '../../../services/publicacion.service';
import { Publicacion } from '../../../models/publicacion.model';
import { MeGustaComponent } from '../me-gusta.component/me-gusta.component';
import { ComentariosComponent } from '../comentarios.component/comentarios.component';
import { ModalComponent } from '../../../shared/modal.component/modal.component';
import { CopiarLinkDirective } from '../../../shared/directives/copiar-link.directive';
import { SoloAdminDirective } from '../../../shared/directives/solo-admin.directive';
import { HashCortoPipe } from '../../../shared/pipes/hash-corto.pipe';
import { MensajeComponent } from '../../../shared/mensaje.component/mensaje.component';
import { mensajeDeError } from '../../../shared/mensaje-error';

@Component({
  selector: 'app-detalle-publicacion',
  imports: [
    DatePipe,
    RouterLink,
    MeGustaComponent,
    MensajeComponent,
    ComentariosComponent,
    ModalComponent,
    CopiarLinkDirective,
    SoloAdminDirective,
    HashCortoPipe,
  ],
  templateUrl: './detalle-publicacion.component.html',
  styleUrl: './detalle-publicacion.component.css',
})
export class DetallePublicacionComponent {
  publicacion = signal<Publicacion | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);
  confirmando = signal(false);
  eliminando = signal(false);
  errorEliminar = signal<string | null>(null);

  constructor(
    ruta: ActivatedRoute,
    private publicacionService: PublicacionService,
    private router: Router,
  ) {
    ruta.paramMap.subscribe((parametros) => this.cargar(parametros.get('id')!));
  }

  pedirConfirmacion() {
    this.errorEliminar.set(null);
    this.confirmando.set(true);
  }

  cancelarEliminacion() {
    if (!this.eliminando()) {
      this.confirmando.set(false);
    }
  }

  confirmarEliminacion(publicacion: Publicacion) {
    this.eliminando.set(true);
    this.errorEliminar.set(null);

    this.publicacionService.eliminar(publicacion._id).subscribe({
      next: () => {
        this.router.navigate(['/publicaciones'], { state: { aviso: 'Publicación eliminada.' } });
      },
      error: (error: HttpErrorResponse) => {
        this.errorEliminar.set(mensajeDeError(error));
        this.eliminando.set(false);
      },
    });
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
