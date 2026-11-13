import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { SesionService } from '../../../core/auth/sesion.service';
import { mensajeDeError } from '../../../shared/mensaje-error';

@Component({
  selector: 'app-cargando',
  templateUrl: './cargando.component.html',
  styleUrl: './cargando.component.css',
})
export class CargandoComponent {
  constructor(authService: AuthService, sesionService: SesionService, router: Router) {
    const destino = router.currentNavigation()?.extras.state?.['destino'] ?? '/publicaciones';
    const token = sesionService.token();

    if (!token) {
      router.navigate(['/login']);
      return;
    }

    authService.autorizar().subscribe({
      next: (usuario) => {
        sesionService.iniciar(token, usuario);
        router.navigateByUrl(destino);
      },
      error: (error: HttpErrorResponse) => {
        // el 401 ya lo resuelve tokenInterceptor
        if (error.status !== 401) {
          router.navigate(['/login'], { state: { error: mensajeDeError(error) } });
        }
      },
    });
  }
}
