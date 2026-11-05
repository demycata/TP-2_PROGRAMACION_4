import { Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Publicacion } from '../../../models/publicacion.model';
import { SesionService } from '../../../core/auth/sesion.service';
import { MeGustaComponent } from '../me-gusta.component/me-gusta.component';
import { CopiarLinkDirective } from '../../../shared/directives/copiar-link.directive';
import { HashCortoPipe } from '../../../shared/pipes/hash-corto.pipe';
import { TiempoRelativoPipe } from '../../../shared/pipes/tiempo-relativo.pipe';

@Component({
  selector: 'app-publicacion',
  imports: [DatePipe, RouterLink, MeGustaComponent, CopiarLinkDirective, HashCortoPipe, TiempoRelativoPipe],
  templateUrl: './publicacion.component.html',
  styleUrl: './publicacion.component.css',
})
export class PublicacionComponent {
  publicacion = input.required<Publicacion>();
  eliminar = output<Publicacion>();

  esMia = computed(() => this.sesionService.usuario()?._id === this.publicacion().autor._id);

  constructor(private sesionService: SesionService) {}
}
