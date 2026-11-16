export type Grafico = 'publicaciones' | 'comentarios' | 'porPublicacion';

export type OpcionLapso = 7 | 30 | 90 | 'personalizado';

export interface Lapso {
  opcion: OpcionLapso;
  desde: string;
  hasta: string;
}

export interface BotonLapso {
  valor: OpcionLapso;
  texto: string;
}

export interface TarjetaGrafico {
  clave: Grafico;
  titulo: string;
  tipo: string;
  unidad: string;
  ancho?: boolean;
}

export interface PublicacionesPorUsuario {
  usuario: { _id: string; nombreUsuario: string; imagenPerfil: string };
  cantidad: number;
}

export interface ComentariosPorDia {
  fecha: string;
  cantidad: number;
}

export interface ComentariosEnLapso {
  total: number;
  porDia: ComentariosPorDia[];
}

export interface ComentariosPorPublicacion {
  publicacion: { _id: string; titulo: string };
  cantidad: number;
}
