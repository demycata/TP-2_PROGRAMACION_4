import { Directive, TemplateRef, ViewContainerRef, effect, input } from '@angular/core';
import { SesionService } from '../../core/auth/sesion.service';

// *appSoloAdmin               → solo lo ve un administrador
// *appSoloAdmin="p.autor._id" → lo ve un administrador o el usuario con ese id
// El id va como valor directo porque en la microsintaxis lo primero siempre es el valor de la directiva
// (con *appSoloAdmin="autor: id", Angular leería "autor" como una expresión).
@Directive({ selector: '[appSoloAdmin]' })
export class SoloAdminDirective {
  autor = input<string>('', { alias: 'appSoloAdmin' });

  private visible = false;

  constructor(plantilla: TemplateRef<unknown>, contenedor: ViewContainerRef, sesionService: SesionService) {
    effect(() => {
      const usuario = sesionService.usuario();
      const mostrar =
        usuario?.perfil === 'administrador' || (!!usuario && usuario._id === this.autor());

      if (mostrar && !this.visible) {
        contenedor.createEmbeddedView(plantilla);
      } else if (!mostrar && this.visible) {
        contenedor.clear();
      }
      this.visible = mostrar;
    });
  }
}
