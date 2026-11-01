import { Usuario } from './usuario.model';

export interface Publicacion {
  _id: string;
  titulo: string;
  mensaje: string;
  imagen?: string;
  autor: Pick<Usuario, '_id' | 'nombre' | 'apellido' | 'nombreUsuario' | 'imagenPerfil'>;
  cantidadMeGusta: number;
  meGustaDado: boolean;
  createdAt: string;
}

export type EstadoMeGusta = Pick<Publicacion, 'cantidadMeGusta' | 'meGustaDado'>;

export type OrdenPublicaciones = 'fecha' | 'meGusta';

export interface OpcionOrden {
  valor: OrdenPublicaciones;
  texto: string;
}

export interface FiltrosPublicaciones {
  orden: OrdenPublicaciones;
  offset: number;
  limit: number;
  usuario?: string;
}

export interface ListadoPublicaciones {
  publicaciones: Publicacion[];
  total: number;
}
