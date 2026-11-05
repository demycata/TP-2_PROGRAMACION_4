import { DestroyRef, Directive, input, signal } from '@angular/core';
import { EstadoCopia } from '../../models/publicacion.model';

@Directive({
  selector: '[appCopiarLink]',
  exportAs: 'copiarLink',
  host: { '(click)': 'copiar()' },
})
export class CopiarLinkDirective {
  appCopiarLink = input.required<string>();

  estado = signal<EstadoCopia>('inicial');

  private temporizador?: ReturnType<typeof setTimeout>;

  constructor(destroyRef: DestroyRef) {
    destroyRef.onDestroy(() => clearTimeout(this.temporizador));
  }

  async copiar() {
    try {
      await navigator.clipboard.writeText(`${location.origin}${this.appCopiarLink()}`);
      this.mostrar('copiado');
    } catch {
      this.mostrar('error');
    }
  }

  private mostrar(estado: EstadoCopia) {
    clearTimeout(this.temporizador);
    this.estado.set(estado);
    this.temporizador = setTimeout(() => this.estado.set('inicial'), 2500);
  }
}
