import { Component, DestroyRef, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { UsuarioService } from '../../../services/usuario.service';
import { SesionService } from '../../../core/auth/sesion.service';
import { Usuario } from '../../../models/usuario.model';
import { ModalComponent } from '../../../shared/modal.component/modal.component';
import { mensajeDeError } from '../../../shared/mensaje-error';

@Component({
  selector: 'app-usuarios',
  imports: [DatePipe, RouterLink, ModalComponent],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.css',
})
export class UsuariosComponent {
  usuarios = signal<Usuario[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);
  aviso = signal<string | null>(null);
  procesando = signal<string | null>(null);
  errorAccion = signal<string | null>(null);
  aDeshabilitar = signal<Usuario | null>(null);

  deshabilitados = computed(() => this.usuarios().filter((u) => !u.habilitado).length);

  private temporizadorAviso?: ReturnType<typeof setTimeout>;

  constructor(
    private usuarioService: UsuarioService,
    protected sesionService: SesionService,
    router: Router,
    destroyRef: DestroyRef,
  ) {
    const aviso = router.currentNavigation()?.extras.state?.['aviso'];
    if (aviso) {
      this.mostrarAviso(aviso);
    }
    destroyRef.onDestroy(() => clearTimeout(this.temporizadorAviso));
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);

    this.usuarioService.listar().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(mensajeDeError(error));
        this.cargando.set(false);
      },
    });
  }

  pedirConfirmacion(usuario: Usuario) {
    this.errorAccion.set(null);
    this.aDeshabilitar.set(usuario);
  }

  cancelarDeshabilitar() {
    if (!this.procesando()) {
      this.aDeshabilitar.set(null);
    }
  }

  deshabilitar(usuario: Usuario) {
    this.cambiarEstado(
      usuario,
      this.usuarioService.deshabilitar(usuario._id),
      `@${usuario.nombreUsuario} quedó deshabilitado.`,
    );
  }

  habilitar(usuario: Usuario) {
    this.cambiarEstado(
      usuario,
      this.usuarioService.habilitar(usuario._id),
      `@${usuario.nombreUsuario} volvió a estar habilitado.`,
    );
  }

  private cambiarEstado(usuario: Usuario, pedido: Observable<Usuario>, mensaje: string) {
    this.procesando.set(usuario._id);
    this.errorAccion.set(null);

    pedido.subscribe({
      next: (actualizado) => {
        this.usuarios.update((usuarios) =>
          usuarios.map((u) => (u._id === actualizado._id ? actualizado : u)),
        );
        this.procesando.set(null);
        this.aDeshabilitar.set(null);
        this.mostrarAviso(mensaje);
      },
      error: (error: HttpErrorResponse) => {
        this.errorAccion.set(mensajeDeError(error));
        this.procesando.set(null);
      },
    });
  }

  private mostrarAviso(mensaje: string) {
    clearTimeout(this.temporizadorAviso);
    this.aviso.set(mensaje);
    this.temporizadorAviso = setTimeout(() => this.aviso.set(null), 3000);
  }
}
