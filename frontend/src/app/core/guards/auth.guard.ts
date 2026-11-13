import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SesionService } from '../auth/sesion.service';

export const authGuard: CanActivateFn = (route, state) => {
  const sesionService = inject(SesionService);
  const router = inject(Router);

  if (sesionService.validada) {
    return true;
  }

  // el destino se guarda para que un link a una publicación siga funcionando después de validar el token
  router.navigate(['/cargando'], { state: { destino: state.url } });
  return false;
};
