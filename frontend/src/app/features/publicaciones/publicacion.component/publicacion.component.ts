import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Publicacion } from '../../../models/publicacion.model';
import { MeGustaComponent } from '../me-gusta.component/me-gusta.component';
import { CopiarLinkDirective } from '../../../shared/directives/copiar-link.directive';
import { SoloAdminDirective } from '../../../shared/directives/solo-admin.directive';
import { HashCortoPipe } from '../../../shared/pipes/hash-corto.pipe';
import { TiempoRelativoPipe } from '../../../shared/pipes/tiempo-relativo.pipe';
import { MensajeComponent } from '../../../shared/mensaje.component/mensaje.component';

@Component({
  selector: 'app-publicacion',
  imports: [
    DatePipe,
    RouterLink,
    MeGustaComponent,
    MensajeComponent,
    CopiarLinkDirective,
    SoloAdminDirective,
    HashCortoPipe,
    TiempoRelativoPipe,
  ],
  templateUrl: './publicacion.component.html',
  styleUrl: './publicacion.component.css',
})
export class PublicacionComponent {
  publicacion = input.required<Publicacion>();
  eliminar = output<Publicacion>();
}
