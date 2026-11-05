import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SesionService } from '../auth/sesion.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const sesionService = inject(SesionService);
  const router = inject(Router);
  const token = sesionService.token(); //lee el token del localStorage
  const pedido = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req; //si hay token, agrega el header de autorización con el token

  return next(pedido).pipe(
    catchError((error: HttpErrorResponse) => {
      // el login también da 401 con la contraseña mal, y ahí no terminó ninguna sesión
      if (error.status === 401 && !req.url.endsWith('/auth/login')) {
        sesionService.cerrar();
        router.navigate(['/login'], { state: { error: 'Tu sesión terminó. Volvé a ingresar.' } });
      }
      return throwError(() => error);
    }),
  );
};
