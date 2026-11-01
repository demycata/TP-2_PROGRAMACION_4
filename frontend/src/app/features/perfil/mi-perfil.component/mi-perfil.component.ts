import { Component, Signal, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { SesionService } from '../../../core/auth/sesion.service';
import { PublicacionService } from '../../../services/publicacion.service';
import { Usuario } from '../../../models/usuario.model';
import { Publicacion } from '../../../models/publicacion.model';
import { TiempoRelativoPipe } from '../../../shared/pipes/tiempo-relativo.pipe';
import { mensajeDeError } from '../../../shared/mensaje-error';

@Component({
  selector: 'app-mi-perfil',
  imports: [DatePipe, RouterLink, TiempoRelativoPipe],
  templateUrl: './mi-perfil.component.html',
  styleUrl: './mi-perfil.component.css',
})
export class MiPerfilComponent {
  usuario: Signal<Usuario | null>;
  publicaciones = signal<Publicacion[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  constructor(
    sesionService: SesionService,
    private publicacionService: PublicacionService,
  ) {
    this.usuario = sesionService.usuario;
    const usuario = this.usuario();
    if (usuario) {
      this.cargarPublicaciones(usuario._id);
    }
  }

  private cargarPublicaciones(usuario: string) {
    this.publicacionService.listar({ orden: 'fecha', offset: 0, limit: 3, usuario }).subscribe({
      next: ({ publicaciones }) => {
        this.publicaciones.set(publicaciones);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(mensajeDeError(error));
        this.cargando.set(false);
      },
    });
  }
}
