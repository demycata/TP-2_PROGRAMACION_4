import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Publicacion } from '../../../models/publicacion.model';
import { NuevaPublicacionComponent } from '../nueva-publicacion.component/nueva-publicacion.component';
import { HashCortoPipe } from '../../../shared/pipes/hash-corto.pipe';

@Component({
  selector: 'app-crear-publicacion',
  imports: [RouterLink, NuevaPublicacionComponent, HashCortoPipe],
  templateUrl: './crear-publicacion.component.html',
  styleUrl: './crear-publicacion.component.css',
})
export class CrearPublicacionComponent {
  publicada = signal<Publicacion | null>(null);
}
