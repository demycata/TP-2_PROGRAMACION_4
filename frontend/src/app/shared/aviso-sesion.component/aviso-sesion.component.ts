import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { interval } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SEGUNDOS_AVISO, SesionService } from '../../core/auth/sesion.service';
import { ModalComponent } from '../modal.component/modal.component';
import { mensajeDeError } from '../mensaje-error';

@Component({
  selector: 'app-aviso-sesion',
  imports: [ModalComponent, DatePipe],
  templateUrl: './aviso-sesion.component.html',
  styleUrl: './aviso-sesion.component.css',
})
export class AvisoSesionComponent {
  segundosAviso = SEGUNDOS_AVISO;
  segundos = signal(0);
  extendiendo = signal(false);
  error = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private sesionService: SesionService,
    private router: Router,
  ) {
    this.actualizarSegundos(); //actualiza los segundos restantes para que se muestre el aviso de sesión
    interval(1000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.actualizarSegundos());
  }

  extender() {
    this.extendiendo.set(true);
    this.error.set(null);

    this.authService.refrescar().subscribe({
      next: ({ token }) => this.sesionService.renovar(token),
      error: (error: HttpErrorResponse) => {
        // 403: un administrador lo deshabilitó mientras tenía la sesión abierta
        if (error.status === 403) {
          this.sesionService.cerrar();
          this.router.navigate(['/login'], { state: { error: mensajeDeError(error) } });
          return;
        }
        this.error.set(mensajeDeError(error));
        this.extendiendo.set(false);
      },
    });
  }

  ocultar() {
    this.sesionService.avisoVencimiento.set(false);
  }

  cerrarSesion() {
    this.sesionService.cerrar();
    this.router.navigate(['/login'], { state: { mensaje: 'Cerraste la sesión.' } });
  }

  private actualizarSegundos() {
    const segundos = Math.ceil((this.sesionService.vencimiento() - Date.now()) / 1000);
    this.segundos.set(Math.max(segundos, 0));

    if (segundos <= 0) {
      this.sesionService.cerrar();
      this.router.navigate(['/login'], { state: { error: 'Tu sesión terminó. Volvé a ingresar.' } });
    }
  }
}
