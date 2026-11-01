import { DestroyRef, Directive, ElementRef, output } from '@angular/core';

@Directive({ selector: '[appAlAparecer]' })
export class AlAparecerDirective {
  appAlAparecer = output<void>();

  constructor(elemento: ElementRef<HTMLElement>, destroyRef: DestroyRef) {
    // rootMargin: avisa 300px antes de que el elemento llegue a verse, así la carga arranca antes del final
    const observador = new IntersectionObserver( //observa el elemento y detecta si está visible
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          this.appAlAparecer.emit();
        }
      },
      //{ rootMargin: '300px' },
    );
    observador.observe(elemento.nativeElement);
    destroyRef.onDestroy(() => observador.disconnect());
  }
}
