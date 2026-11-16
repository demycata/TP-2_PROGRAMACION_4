import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { SesionService } from '../auth/sesion.service';

// con false el router seguiría buscando y caería en el comodín, que manda al login a alguien con sesión
export const adminGuard: CanMatchFn = () => {
  const sesionService = inject(SesionService);
  const router = inject(Router);

  return sesionService.usuario()?.perfil === 'administrador' || router.createUrlTree(['/publicaciones']);
};
