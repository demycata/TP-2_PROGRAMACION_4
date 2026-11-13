import { Service, signal } from '@angular/core';
import { Usuario } from '../../models/usuario.model';

const CLAVE_TOKEN = 'commit_token';
const CLAVE_USUARIO = 'commit_usuario';

export const SEGUNDOS_AVISO = 30;

@Service()
export class SesionService {
  usuario = signal<Usuario | null>(this.leerUsuario());
  avisoVencimiento = signal(false);
  validada = false;
  private temporizador?: ReturnType<typeof setTimeout>;

  iniciar(token: string, usuario: Usuario) {
    localStorage.setItem(CLAVE_TOKEN, token);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
    this.usuario.set(usuario);
    this.validada = true;
    this.programarAviso();
  }

  renovar(token: string) {
    localStorage.setItem(CLAVE_TOKEN, token);
    this.programarAviso();
  }

  cerrar() {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    this.usuario.set(null);
    this.validada = false;
    this.avisoVencimiento.set(false);
    clearTimeout(this.temporizador);
  }

  token() {
    return localStorage.getItem(CLAVE_TOKEN);
  }

  // el payload del JWT viene en base64url, y atob solo entiende base64
  vencimiento(): number {
    const payload = this.token()!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).exp * 1000;
  }

  // se calcula desde el vencimiento del token, así el aviso sigue a tiempo aunque se recargue la página
  private programarAviso() {
    clearTimeout(this.temporizador);
    this.avisoVencimiento.set(false);
    const espera = this.vencimiento() - SEGUNDOS_AVISO * 1000 - Date.now();
    this.temporizador = setTimeout(() => this.avisoVencimiento.set(true), espera);
  }

  private leerUsuario(): Usuario | null {
    const guardado = localStorage.getItem(CLAVE_USUARIO);
    return guardado ? JSON.parse(guardado) : null;
  }
}
