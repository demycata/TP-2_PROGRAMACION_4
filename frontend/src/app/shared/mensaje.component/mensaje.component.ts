import { Component, booleanAttribute, input } from '@angular/core';
import { FormatoMensajePipe } from '../pipes/formato-mensaje.pipe';

@Component({
  selector: 'app-mensaje',
  imports: [FormatoMensajePipe],
  templateUrl: './mensaje.component.html',
  styleUrl: './mensaje.component.css',
  host: { '[class.resumen]': 'resumen()' },
})
export class MensajeComponent {
  texto = input.required<string>();
  resumen = input(false, { transform: booleanAttribute });
}
