import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  ActividadDia,
  EstadoMeGusta,
  FiltrosPublicaciones,
  ListadoPublicaciones,
  Publicacion,
} from '../models/publicacion.model';

@Service()
export class PublicacionService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/publicaciones`;

  listar(filtros: FiltrosPublicaciones) {
    return this.http.get<ListadoPublicaciones>(this.url, { params: { ...filtros } });
  }

  obtener(id: string) {
    return this.http.get<Publicacion>(`${this.url}/${id}`);
  }

  actividad() {
    return this.http.get<ActividadDia[]>(`${this.url}/actividad`);
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
