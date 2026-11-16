export type PerfilUsuario = 'usuario' | 'administrador';

export interface Usuario {
  _id: string;
  nombre: string;
  apellido: string;
  correo: string;
  nombreUsuario: string;
  fechaNacimiento: string;
  descripcion: string;
  imagenPerfil: string;
  perfil: PerfilUsuario;
  habilitado: boolean;
  createdAt: string;
}

export interface OpcionPerfil {
  valor: PerfilUsuario;
  texto: string;
  descripcion: string;
}
