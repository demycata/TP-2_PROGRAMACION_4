import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SesionService } from '../auth/sesion.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(SesionService).token(); //lee el token del localStorage 
  if (!token) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })); //si hay token, agrega el header de autorización con el token
};
