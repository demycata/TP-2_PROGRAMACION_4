import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ETIQUETAS } from '../etiquetas';

@Component({
  selector: 'app-explorador',
  imports: [RouterLink],
  templateUrl: './explorador.component.html',
  styleUrl: './explorador.component.css',
})
export class ExploradorComponent {
  activa = input<string | null>(null);

  etiquetas = ETIQUETAS;
}
