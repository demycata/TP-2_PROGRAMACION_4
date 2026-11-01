import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Usuario } from '../core/auth/sesion.service';

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

@Service()
export class PublicacionService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/publicaciones`;

  listar(filtros: FiltrosPublicaciones) {
    return this.http.get<ListadoPublicaciones>(this.url, { params: { ...filtros } });
  }

  crear(datos: FormData) {
    return this.http.post<Publicacion>(this.url, datos);
  }

  eliminar(id: string) {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  darMeGusta(id: string) {
    return this.http.post<EstadoMeGusta>(`${this.url}/${id}/me-gusta`, null);
  }

  quitarMeGusta(id: string) {
    return this.http.delete<EstadoMeGusta>(`${this.url}/${id}/me-gusta`);
  }
}
