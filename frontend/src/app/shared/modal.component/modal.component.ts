import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
  host: { '(document:keydown.escape)': 'cerrar.emit()' },
})
export class ModalComponent {
  titulo = input.required<string>();
  cerrar = output();
}
