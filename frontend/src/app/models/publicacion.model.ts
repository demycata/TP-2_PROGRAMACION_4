import { Usuario } from './usuario.model';

export type Etiqueta = 'duda' | 'proyecto' | 'recurso' | 'novedad';

export interface OpcionEtiqueta {
  valor: Etiqueta;
  descripcion: string;
}

export interface Publicacion {
  _id: string;
  titulo: string;
  mensaje: string;
  imagen?: string;
  etiqueta?: Etiqueta;
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
  etiqueta?: Etiqueta;
}

export interface ListadoPublicaciones {
  publicaciones: Publicacion[];
  total: number;
}

export type EstadoCopia = 'inicial' | 'copiado' | 'error';

export interface ActividadDia {
  fecha: string;
  cantidad: number;
}

export interface CeldaActividad extends ActividadDia {
  nivel: number;
}
