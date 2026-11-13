import { Usuario } from './usuario.model';

export interface Comentario {
  _id: string;
  publicacion: string;
  autor: Pick<Usuario, '_id' | 'nombre' | 'apellido' | 'nombreUsuario' | 'imagenPerfil'>;
  mensaje: string;
  modificado: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FiltrosComentarios {
  offset: number;
  limit: number;
}

export interface ListadoComentarios {
  comentarios: Comentario[];
  total: number;
}
