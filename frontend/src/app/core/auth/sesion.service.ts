import { Service, signal } from '@angular/core';

export interface Usuario {
  _id: string;
  nombre: string;
  apellido: string;
  correo: string;
  nombreUsuario: string;
  fechaNacimiento: string;
  descripcion: string;
  imagenPerfil: string;
  perfil: 'usuario' | 'administrador';
  createdAt: string;
}

const CLAVE_TOKEN = 'commit_token';
const CLAVE_USUARIO = 'commit_usuario';

@Service()
export class SesionService {
  usuario = signal<Usuario | null>(this.leerUsuario());

  iniciar(token: string, usuario: Usuario) {
    localStorage.setItem(CLAVE_TOKEN, token);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
    this.usuario.set(usuario);
  }

  cerrar() {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    this.usuario.set(null);
  }

  token() {
    return localStorage.getItem(CLAVE_TOKEN);
  }

  private leerUsuario(): Usuario | null {
    const guardado = localStorage.getItem(CLAVE_USUARIO);
    return guardado ? JSON.parse(guardado) : null;
  }
}
